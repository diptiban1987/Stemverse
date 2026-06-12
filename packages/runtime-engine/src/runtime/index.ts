import { IRuntime } from '../core';
import { TargetId, TargetState, ASTScript, Thread, SpriteState, StageState, PendingBroadcast, BroadcastCompletionToken, ListenerEntry, BubbleState, StageSyncState, CostumeAsset, SoundAsset, BackdropAsset, ActiveSoundTrigger, SoundChannelState, PenCommand, PenState, VariableWatcher, WatcherMode, ListWatcher, ListWatcherMode, GlideState, KeyboardState, MouseState, RuntimeQuestion, RuntimeAnswerState, SerializedProject, SerializedStage, SerializedTarget, SerializedAssetManifest, SerializedProjectMetadata, VariableState, ListState, RuntimeAssetState, AssetLoadStatus, LocalTransformState, WorldTransformState, TransformHierarchyEntry, CameraState, ViewportState, VelocityState, AccelerationState, CollisionBounds, ConstraintState, ComponentType, RuntimeComponent, PinDirection, RuntimePin, RuntimeConnection, DeviceState, WorkspaceTransform, WorkspaceComponentLayout, WirePoint, WireLayout, DevelopmentBoardType, BoardPinDefinition, BoardPinCapabilities, DevelopmentBoardDefinition, WorkspaceBoard, RenderModelType, RenderMetadata, RuntimeHALState, HardwareAddress, PinMode, PullMode, PinCapability, ProtocolState, ProtocolType, PWMChannelState, I2CBusState, SPIBusState, UARTPortState, HardwareBackendMetadata, ExecutionCommand, ExecutionCommandLifecycleState, ExecutionCommandType, ESP32RuntimeMetadata, ESP32ExecutionState, ESP32PinCapability, ESP32PinMode, ESP32InstructionMetadata, ESP32InstructionExecutionState, ESP32InstructionType, ESP32GPIOExecutionResult, ESP32GPIOExecutionStatus, ESP32PWMExecutionState, ESP32ServoExecutionState, ESP32ADCExecutionState, ESP32TouchExecutionState, ESP32PeripheralCommandExecutionResult, ESP32PeripheralCommandExecutionStatus, ProtocolCommandExecutionResult, ProtocolCommandExecutionStatus, STEMVerseVisualState, STEMVerseVisualThemeState, STEMVerseVisualType, STEMVerseBoardStatus, STEMVerseSignalFlowDirection, STEMVerseVisualThemeMode, ComponentVisualModel, ComponentVisualType, ComponentVisualCategory, PinVisualMetadata, InteractionZone, AnchorPoint, LabelPosition, WireVisualRegistryEntry, WireType, WireCategory, RoutingPathType, SignalDirection, SignalActivity, SignalState, WireVisualModel, ControlPoint, WireRoutingMetadata, SignalVisualizationMetadata, InteractionZoneRect, WireInteractionMetadata, BoardVisualModel, BoardVisualType, BoardVisualCategory, BoardVisualRegistryEntry, BoardLayoutMetadata, ConnectorVisualMetadata, BoardInteractionMetadata, BoardBounds, ComponentRegion, PowerRegion, SignalRegion, ReservedRegion, BoardInteractionZone, SignalVisualModel, SignalVisualType, SignalVisualCategory, DigitalSignalMetadata, DigitalSignalLevel, DigitalSignalDirection, AnalogSignalMetadata, PWMSignalMetadata, ProtocolSignalMetadata, ProtocolSignalType, SignalVariantMetadata, SignalInteractionZone, SignalInteractionMetadata, SignalVisualRegistryEntry, AnimationType, AnimationRepeatMode, AnimationPlaybackMode, AnimationVisualModel, ComponentAnimationMetadata, WireAnimationMetadata, BoardAnimationMetadata, SignalAnimationMetadata, InteractionAnimationMetadata, AnimationRegistryEntry, InteractionMetadata, SelectionMetadata, HoverMetadata, FocusMetadata, InspectionMetadata, InteractionType, SelectionType, HoverPriority, HoverSource, FocusOwnership, InspectionTargetType, RenderNodeModel, NodeType, VisibilityState, SceneGraphModel, ViewportModel, VisibleRegion, RenderPipelineModel, PipelineType, CanvasRenderSnapshot, ComponentRenderModel, ComponentBoundsModel, ComponentLabelModel, ComponentPinRenderModel, ComponentRenderSnapshot, ComponentLabelPosition, WireRenderModel, WirePathModel, WireSegmentModel, WireAnchorModel, BoardRenderModel, BoardBoundsModel, BoardConnectorModel, BoardRegionModel, SignalEffectModel, SignalPropagationModel, SignalColorModel, SignalActivityModel, ThemeModel, ColorPaletteModel, ComponentStyleModel, WorkspaceStyleModel, AnimationPlaybackModel, TimelineModel, KeyframeModel, PlaybackGroupModel, RenderRuntimeModel, RenderPassModel, RenderLayerRuntimeModel, RenderQueueModel, FrameMetadataModel } from '../types';
import { MinimalASTInterpreter, IHardwareAdapter } from '../ast/interpreter';
import { SimulatedHardwareBackend } from '../hal';
import { createThread, TaskQueue, PendingTask, resetThreadCounter } from './execution-context';
import { BreadboardWorkspace } from '../stage/breadboard-workspace';
import { validateBoardRenderModel, validateBoardBoundsModel, validateBoardConnectorModel, validateBoardRegionModel } from '../stage/board-rendering';
import { validateSignalEffectModel, validateSignalPropagationModel, validateSignalColorModel, validateSignalActivityModel } from '../stage/signal-effects';
import { validateThemeModel, validateColorPaletteModel, validateComponentStyleModel, validateWorkspaceStyleModel } from '../stage/visual-themes';
import { validateAnimationPlaybackModel, validateTimelineModel, validateKeyframeModel, validatePlaybackGroupModel } from '../stage/animation-playback';
import { validateRenderRuntimeModel, validateRenderPassModel, validateRenderLayerRuntimeModel, validateRenderQueueModel, validateFrameMetadataModel } from '../stage/render-runtime';

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
  private stemverseVisualRegistry = new Map<string, STEMVerseVisualState>();
  private stemverseVisualOrder: string[] = [];
  private stemverseVisualTheme: STEMVerseVisualThemeState = { themeId: 'stemverse-default', mode: 'LIGHT', classroomMode: false, highContrast: false, metadata: {} };

  // Phase 10B Component visual model registry
  private componentVisualModelRegistry = new Map<string, ComponentVisualModel>();
  private componentVisualModelOrder: string[] = [];

  // Phase 10C Wire visualization registry
  private wireVisualRegistry = new Map<string, WireVisualRegistryEntry>();
  private wireVisualOrder: string[] = [];

  // Phase 10D Board visual registry
  private boardVisualRegistry = new Map<string, BoardVisualRegistryEntry>();
  private boardVisualOrder: string[] = [];

  // Phase 10E Signal visual registry
  private signalVisualRegistry = new Map<string, SignalVisualRegistryEntry>();
  private signalVisualOrder: string[] = [];

  // Phase 10F Animation metadata registry
  private animationRegistry = new Map<string, AnimationRegistryEntry>();
  private animationOrder: string[] = [];

  // Phase 11B Visual interaction registry
  private interactionRegistry = new Map<string, InteractionMetadata>();
  private interactionOrder: string[] = [];

  // Phase 11C Breadboard workspace registry
  public readonly breadboardWorkspace = new BreadboardWorkspace();

  // Phase 12A Canvas rendering foundation registries
  private renderNodeRegistry = new Map<string, RenderNodeModel>();
  private renderNodeOrder: string[] = [];
  private sceneGraphRegistry = new Map<string, SceneGraphModel>();
  private sceneGraphOrder: string[] = [];
  private viewportModelRegistry = new Map<string, ViewportModel>();
  private viewportModelOrder: string[] = [];
  private pipelineRegistry = new Map<string, RenderPipelineModel>();
  private pipelineOrder: string[] = [];

  // Phase 12B Component Rendering Foundation registries
  private componentRenderRegistry = new Map<string, ComponentRenderModel>();
  private componentRenderOrder: string[] = [];
  private componentBoundsRegistry = new Map<string, ComponentBoundsModel>();
  private componentBoundsOrder: string[] = [];
  private componentLabelRegistry = new Map<string, ComponentLabelModel>();
  private componentLabelOrder: string[] = [];
  private componentPinRenderRegistry = new Map<string, ComponentPinRenderModel>();
  private componentPinRenderOrder: string[] = [];

  // Phase 12C Wire Rendering Foundation registries
  private wireRenderRegistry = new Map<string, WireRenderModel>();
  private wireRenderOrder: string[] = [];
  private wirePathRegistry = new Map<string, WirePathModel>();
  private wirePathOrder: string[] = [];
  private wireSegmentRegistry = new Map<string, WireSegmentModel>();
  private wireSegmentOrder: string[] = [];
  private wireAnchorRegistry = new Map<string, WireAnchorModel>();
  private wireAnchorOrder: string[] = [];

  // Phase 12D Board Rendering Foundation registries
  private boardRenderRegistry = new Map<string, BoardRenderModel>();
  private boardRenderOrder: string[] = [];
  private boardBoundsRegistry = new Map<string, BoardBoundsModel>();
  private boardBoundsOrder: string[] = [];
  private boardConnectorRegistry = new Map<string, BoardConnectorModel>();
  private boardConnectorOrder: string[] = [];
  private boardRegionRegistry = new Map<string, BoardRegionModel>();
  private boardRegionOrder: string[] = [];

  // Phase 13A Signal Effects Foundation registries
  private signalEffectRegistry = new Map<string, SignalEffectModel>();
  private signalEffectOrder: string[] = [];
  private signalPropagationRegistry = new Map<string, SignalPropagationModel>();
  private signalPropagationOrder: string[] = [];
  private signalColorRegistry = new Map<string, SignalColorModel>();
  private signalColorOrder: string[] = [];
  private signalActivityRegistry = new Map<string, SignalActivityModel>();
  private signalActivityOrder: string[] = [];

  // Phase 13B Visual Themes Foundation registries
  private themeRegistry = new Map<string, ThemeModel>();
  private themeOrder: string[] = [];
  private colorPaletteRegistry = new Map<string, ColorPaletteModel>();
  private colorPaletteOrder: string[] = [];
  private componentStyleRegistry = new Map<string, ComponentStyleModel>();
  private componentStyleOrder: string[] = [];
  private workspaceStyleRegistry = new Map<string, WorkspaceStyleModel>();
  private workspaceStyleOrder: string[] = [];

  // Phase 13C Animation Playback Foundation registries
  private animationPlaybackRegistry = new Map<string, AnimationPlaybackModel>();
  private animationPlaybackOrder: string[] = [];
  private timelineRegistry = new Map<string, TimelineModel>();
  private timelineOrder: string[] = [];
  private keyframeRegistry = new Map<string, KeyframeModel>();
  private keyframeOrder: string[] = [];
  private playbackGroupRegistry = new Map<string, PlaybackGroupModel>();
  private playbackGroupOrder: string[] = [];

  // Phase 14A Visual Rendering Runtime Foundation registries
  private renderRuntimeRegistry = new Map<string, RenderRuntimeModel>();
  private renderRuntimeOrder: string[] = [];
  private renderPassRegistry = new Map<string, RenderPassModel>();
  private renderPassOrder: string[] = [];
  private renderLayerRegistry = new Map<string, RenderLayerRuntimeModel>();
  private renderLayerOrder: string[] = [];
  private renderQueueRegistry = new Map<string, RenderQueueModel>();
  private renderQueueOrder: string[] = [];
  private frameRegistry = new Map<string, FrameMetadataModel>();
  private frameOrder: string[] = [];


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

  private static readonly VALID_COMPONENT_VISUAL_TYPES: ComponentVisualType[] = ['LED', 'BUTTON', 'BUZZER', 'SERVO', 'ULTRASONIC', 'LCD', 'OLED', 'ESP32', 'ARDUINO_UNO', 'ARDUINO_NANO', 'RASPBERRY_PI_PICO'];
  private static readonly VALID_COMPONENT_VISUAL_CATEGORIES: ComponentVisualCategory[] = ['OUTPUT', 'INPUT', 'DISPLAY', 'BOARD', 'SENSOR', 'ACTUATOR'];
  private static readonly VALID_INTERACTION_ZONE_KINDS = ['hover', 'selection', 'drag', 'focus', 'click'] as const;

  // Phase 10C Wire visualization valid constants
  private static readonly VALID_WIRE_TYPES: WireType[] = ['JUMPER', 'DUPONT', 'CUSTOM'];
  private static readonly VALID_WIRE_CATEGORIES: WireCategory[] = ['STANDARD', 'POWER', 'SIGNAL', 'CUSTOM'];
  private static readonly VALID_ROUTING_PATH_TYPES: RoutingPathType[] = ['STRAIGHT', 'ORTHOGONAL', 'CURVED', 'AUTO'];
  private static readonly VALID_SIGNAL_DIRECTIONS: SignalDirection[] = ['NONE', 'FORWARD', 'REVERSE', 'BIDIRECTIONAL'];
  private static readonly VALID_SIGNAL_ACTIVITIES: SignalActivity[] = ['IDLE', 'ACTIVE', 'PULSING', 'ERROR'];
  private static readonly VALID_SIGNAL_STATES: SignalState[] = ['LOW', 'HIGH', 'PWM', 'ANALOG', 'UNKNOWN'];
  private static readonly VALID_INTERACTION_ZONE_RECT_KINDS = ['hover', 'selection', 'drag', 'routing', 'focus'] as const;

  // Phase 10D Board visualization valid constants
  private static readonly VALID_BOARD_VISUAL_TYPES: BoardVisualType[] = ['BREADBOARD', 'PERFBOARD', 'PCB', 'CUSTOM'];
  private static readonly VALID_BOARD_VISUAL_CATEGORIES: BoardVisualCategory[] = ['PROTOTYPING', 'DEVELOPMENT', 'SHIELD', 'CUSTOM'];
  private static readonly VALID_BOARD_INTERACTION_ZONE_KINDS = ['hover', 'selection', 'drag', 'focus', 'edit'] as const;

  // Phase 10E Signal visualization valid constants
  private static readonly VALID_SIGNAL_VISUAL_TYPES: SignalVisualType[] = ['DIGITAL', 'ANALOG', 'PWM', 'PROTOCOL'];
  private static readonly VALID_SIGNAL_VISUAL_CATEGORIES: SignalVisualCategory[] = ['DIGITAL_SIGNAL', 'ANALOG_SIGNAL', 'PWM_SIGNAL', 'PROTOCOL_SIGNAL', 'CUSTOM'];
  private static readonly VALID_DIGITAL_SIGNAL_LEVELS: DigitalSignalLevel[] = ['HIGH', 'LOW', 'FLOATING'];
  private static readonly VALID_DIGITAL_SIGNAL_DIRECTIONS: DigitalSignalDirection[] = ['INPUT', 'OUTPUT', 'BIDIRECTIONAL'];
  private static readonly VALID_PROTOCOL_SIGNAL_TYPES: ProtocolSignalType[] = ['I2C', 'SPI', 'UART', 'ONEWIRE', 'CUSTOM'];
  private static readonly VALID_SIGNAL_INTERACTION_ZONE_KINDS = ['hover', 'selection', 'focus', 'inspection', 'debug'] as const;

  // Phase 10F Animation metadata valid constants
  private static readonly VALID_ANIMATION_TYPES: AnimationType[] = ['LED_BLINK', 'SERVO_MOTION', 'BUTTON_PRESS', 'LCD_REFRESH', 'OLED_REFRESH', 'SIGNAL_FLOW', 'PULSE', 'POWER_ACTIVITY', 'STATUS_INDICATOR', 'HIGH_TRANSITION', 'LOW_TRANSITION', 'PWM_TRANSITION', 'ANALOG_TRANSITION', 'PROTOCOL_TRAFFIC', 'HOVER', 'SELECTION', 'FOCUS', 'EDITING', 'CUSTOM'];
  private static readonly VALID_ANIMATION_REPEAT_MODES: AnimationRepeatMode[] = ['NONE', 'LOOP', 'BOUNCE'];
  private static readonly VALID_ANIMATION_PLAYBACK_MODES: AnimationPlaybackMode[] = ['FORWARD', 'REVERSE', 'PING_PONG'];

  private static readonly DEFAULT_COMPONENT_VISUAL_MODELS: Record<string, ComponentVisualModel> = {
    'LED': {
      modelId: 'led-default', componentType: 'LED', displayName: 'LED', category: 'OUTPUT', defaultWidth: 20, defaultHeight: 20,
      anchorPoints: [{ anchorId: 'center', x: 10, y: 10 }],
      pinVisualMetadata: [
        { pinId: 'anode', label: 'Anode (+)', type: 'power', group: 'power', position: { x: 10, y: 0 }, direction: 'up', futureActiveStateHints: {} },
        { pinId: 'cathode', label: 'Cathode (-)', type: 'ground', group: 'ground', position: { x: 10, y: 20 }, direction: 'down', futureActiveStateHints: {} },
      ],
      labelPositions: [{ labelId: 'name', text: 'LED', x: 10, y: 10 }],
      interactionZones: [{ zoneId: 'body', kind: 'hover', x: 0, y: 0, width: 20, height: 20 }],
      futureAnimationHints: {}, futureSkinHints: {}, futureThemeHints: {},
    },
    'BUTTON': {
      modelId: 'button-default', componentType: 'BUTTON', displayName: 'Button', category: 'INPUT', defaultWidth: 30, defaultHeight: 20,
      anchorPoints: [{ anchorId: 'center', x: 15, y: 10 }],
      pinVisualMetadata: [
        { pinId: 'pin1', label: 'Pin 1', type: 'digital', group: 'signal', position: { x: 0, y: 10 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'pin2', label: 'Pin 2', type: 'digital', group: 'signal', position: { x: 30, y: 10 }, direction: 'right', futureActiveStateHints: {} },
      ],
      labelPositions: [{ labelId: 'name', text: 'BTN', x: 15, y: 10 }],
      interactionZones: [{ zoneId: 'body', kind: 'hover', x: 0, y: 0, width: 30, height: 20 }],
      futureAnimationHints: {}, futureSkinHints: {}, futureThemeHints: {},
    },
    'BUZZER': {
      modelId: 'buzzer-default', componentType: 'BUZZER', displayName: 'Buzzer', category: 'OUTPUT', defaultWidth: 25, defaultHeight: 25,
      anchorPoints: [{ anchorId: 'center', x: 12.5, y: 12.5 }],
      pinVisualMetadata: [
        { pinId: 'vcc', label: 'VCC', type: 'power', group: 'power', position: { x: 0, y: 8 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gnd', label: 'GND', type: 'ground', group: 'ground', position: { x: 0, y: 16 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'sig', label: 'Signal', type: 'digital', group: 'signal', position: { x: 25, y: 12.5 }, direction: 'right', futureActiveStateHints: {} },
      ],
      labelPositions: [{ labelId: 'name', text: 'BZ', x: 12.5, y: 12.5 }],
      interactionZones: [{ zoneId: 'body', kind: 'hover', x: 0, y: 0, width: 25, height: 25 }],
      futureAnimationHints: {}, futureSkinHints: {}, futureThemeHints: {},
    },
    'SERVO': {
      modelId: 'servo-default', componentType: 'SERVO', displayName: 'Servo Motor', category: 'ACTUATOR', defaultWidth: 40, defaultHeight: 30,
      anchorPoints: [{ anchorId: 'center', x: 20, y: 15 }],
      pinVisualMetadata: [
        { pinId: 'pwm', label: 'PWM', type: 'pwm', group: 'signal', position: { x: 0, y: 5 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'vcc', label: 'VCC', type: 'power', group: 'power', position: { x: 0, y: 15 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gnd', label: 'GND', type: 'ground', group: 'ground', position: { x: 0, y: 25 }, direction: 'left', futureActiveStateHints: {} },
      ],
      labelPositions: [{ labelId: 'name', text: 'SERVO', x: 20, y: 15 }],
      interactionZones: [{ zoneId: 'body', kind: 'hover', x: 0, y: 0, width: 40, height: 30 }],
      futureAnimationHints: {}, futureSkinHints: {}, futureThemeHints: {},
    },
    'ULTRASONIC': {
      modelId: 'ultrasonic-default', componentType: 'ULTRASONIC', displayName: 'Ultrasonic Sensor', category: 'SENSOR', defaultWidth: 50, defaultHeight: 25,
      anchorPoints: [{ anchorId: 'center', x: 25, y: 12.5 }],
      pinVisualMetadata: [
        { pinId: 'vcc', label: 'VCC', type: 'power', group: 'power', position: { x: 0, y: 5 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'trig', label: 'Trig', type: 'digital', group: 'signal', position: { x: 0, y: 12.5 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'echo', label: 'Echo', type: 'digital', group: 'signal', position: { x: 0, y: 20 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gnd', label: 'GND', type: 'ground', group: 'ground', position: { x: 50, y: 12.5 }, direction: 'right', futureActiveStateHints: {} },
      ],
      labelPositions: [{ labelId: 'name', text: 'HC-SR04', x: 25, y: 12.5 }],
      interactionZones: [{ zoneId: 'body', kind: 'hover', x: 0, y: 0, width: 50, height: 25 }],
      futureAnimationHints: {}, futureSkinHints: {}, futureThemeHints: {},
    },
    'LCD': {
      modelId: 'lcd-default', componentType: 'LCD', displayName: 'LCD 16x2', category: 'DISPLAY', defaultWidth: 120, defaultHeight: 60,
      anchorPoints: [{ anchorId: 'center', x: 60, y: 30 }],
      pinVisualMetadata: [
        { pinId: 'vss', label: 'VSS', type: 'ground', group: 'power', position: { x: 0, y: 10 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'vdd', label: 'VDD', type: 'power', group: 'power', position: { x: 0, y: 20 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'vo', label: 'V0', type: 'analog', group: 'control', position: { x: 0, y: 30 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'rs', label: 'RS', type: 'digital', group: 'control', position: { x: 0, y: 40 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'rw', label: 'RW', type: 'digital', group: 'control', position: { x: 0, y: 50 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'en', label: 'EN', type: 'digital', group: 'control', position: { x: 120, y: 10 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'd4', label: 'D4', type: 'digital', group: 'data', position: { x: 120, y: 20 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'd5', label: 'D5', type: 'digital', group: 'data', position: { x: 120, y: 30 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'd6', label: 'D6', type: 'digital', group: 'data', position: { x: 120, y: 40 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'd7', label: 'D7', type: 'digital', group: 'data', position: { x: 120, y: 50 }, direction: 'right', futureActiveStateHints: {} },
      ],
      labelPositions: [{ labelId: 'name', text: 'LCD', x: 60, y: 15 }],
      interactionZones: [{ zoneId: 'body', kind: 'hover', x: 0, y: 0, width: 120, height: 60 }],
      futureAnimationHints: {}, futureSkinHints: {}, futureThemeHints: {},
    },
    'OLED': {
      modelId: 'oled-default', componentType: 'OLED', displayName: 'OLED Display', category: 'DISPLAY', defaultWidth: 60, defaultHeight: 40,
      anchorPoints: [{ anchorId: 'center', x: 30, y: 20 }],
      pinVisualMetadata: [
        { pinId: 'vcc', label: 'VCC', type: 'power', group: 'power', position: { x: 0, y: 8 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gnd', label: 'GND', type: 'ground', group: 'ground', position: { x: 0, y: 16 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'scl', label: 'SCL', type: 'i2c', group: 'i2c', position: { x: 0, y: 24 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'sda', label: 'SDA', type: 'i2c', group: 'i2c', position: { x: 0, y: 32 }, direction: 'left', futureActiveStateHints: {} },
      ],
      labelPositions: [{ labelId: 'name', text: 'OLED', x: 30, y: 20 }],
      interactionZones: [{ zoneId: 'body', kind: 'hover', x: 0, y: 0, width: 60, height: 40 }],
      futureAnimationHints: {}, futureSkinHints: {}, futureThemeHints: {},
    },
    'ESP32': {
      modelId: 'esp32-default', componentType: 'ESP32', displayName: 'ESP32 DevKit V1', category: 'BOARD', defaultWidth: 80, defaultHeight: 100,
      anchorPoints: [
        { anchorId: 'center', x: 40, y: 50 },
        { anchorId: 'top', x: 40, y: 0 },
      ],
      pinVisualMetadata: [
        { pinId: 'en', label: 'EN', type: 'digital', group: 'control', position: { x: 0, y: 5 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gpio0', label: 'GPIO0', type: 'digital', group: 'gpio', position: { x: 0, y: 15 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gpio1', label: 'GPIO1', type: 'digital', group: 'gpio', position: { x: 0, y: 25 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gpio2', label: 'GPIO2', type: 'digital', group: 'gpio', position: { x: 0, y: 35 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gpio3', label: 'GPIO3', type: 'digital', group: 'gpio', position: { x: 0, y: 45 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gpio4', label: 'GPIO4', type: 'digital', group: 'gpio', position: { x: 0, y: 55 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gpio5', label: 'GPIO5', type: 'digital', group: 'gpio', position: { x: 0, y: 65 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gpio6', label: 'GPIO6', type: 'digital', group: 'gpio', position: { x: 0, y: 75 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gpio7', label: 'GPIO7', type: 'digital', group: 'gpio', position: { x: 0, y: 85 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gpio8', label: 'GPIO8', type: 'digital', group: 'gpio', position: { x: 0, y: 95 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gpio9', label: 'GPIO9', type: 'digital', group: 'gpio', position: { x: 80, y: 5 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'gpio10', label: 'GPIO10', type: 'digital', group: 'gpio', position: { x: 80, y: 15 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'vin', label: 'VIN', type: 'power', group: 'power', position: { x: 80, y: 25 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'gnd', label: 'GND', type: 'ground', group: 'ground', position: { x: 80, y: 35 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'd13', label: 'D13', type: 'digital', group: 'gpio', position: { x: 80, y: 45 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'd12', label: 'D12', type: 'digital', group: 'gpio', position: { x: 80, y: 55 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'd14', label: 'D14', type: 'digital', group: 'gpio', position: { x: 80, y: 65 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'd27', label: 'D27', type: 'digital', group: 'gpio', position: { x: 80, y: 75 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'd26', label: 'D26', type: 'digital', group: 'gpio', position: { x: 80, y: 85 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'd25', label: 'D25', type: 'digital', group: 'gpio', position: { x: 80, y: 95 }, direction: 'right', futureActiveStateHints: {} },
      ],
      labelPositions: [{ labelId: 'name', text: 'ESP32', x: 40, y: 50 }],
      interactionZones: [{ zoneId: 'body', kind: 'hover', x: 0, y: 0, width: 80, height: 100 }],
      futureAnimationHints: {}, futureSkinHints: {}, futureThemeHints: {},
    },
    'ARDUINO_UNO': {
      modelId: 'arduino-uno-default', componentType: 'ARDUINO_UNO', displayName: 'Arduino Uno', category: 'BOARD', defaultWidth: 100, defaultHeight: 120,
      anchorPoints: [
        { anchorId: 'center', x: 50, y: 60 },
        { anchorId: 'top', x: 50, y: 0 },
      ],
      pinVisualMetadata: [
        { pinId: 'd0', label: 'D0/RX', type: 'digital', group: 'gpio', position: { x: 0, y: 10 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'd1', label: 'D1/TX', type: 'digital', group: 'gpio', position: { x: 0, y: 20 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'd2', label: 'D2', type: 'digital', group: 'gpio', position: { x: 0, y: 30 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'd3', label: 'D3', type: 'pwm', group: 'gpio', position: { x: 0, y: 40 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'd4', label: 'D4', type: 'digital', group: 'gpio', position: { x: 0, y: 50 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'd5', label: 'D5', type: 'pwm', group: 'gpio', position: { x: 0, y: 60 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'd6', label: 'D6', type: 'pwm', group: 'gpio', position: { x: 0, y: 70 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'd7', label: 'D7', type: 'digital', group: 'gpio', position: { x: 0, y: 80 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'd8', label: 'D8', type: 'digital', group: 'gpio', position: { x: 0, y: 90 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'd9', label: 'D9', type: 'pwm', group: 'gpio', position: { x: 0, y: 100 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'd10', label: 'D10', type: 'pwm', group: 'gpio', position: { x: 0, y: 110 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'a0', label: 'A0', type: 'analog', group: 'analog', position: { x: 100, y: 10 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'a1', label: 'A1', type: 'analog', group: 'analog', position: { x: 100, y: 20 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'a2', label: 'A2', type: 'analog', group: 'analog', position: { x: 100, y: 30 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'a3', label: 'A3', type: 'analog', group: 'analog', position: { x: 100, y: 40 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'a4', label: 'A4', type: 'analog', group: 'analog', position: { x: 100, y: 50 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'a5', label: 'A5', type: 'analog', group: 'analog', position: { x: 100, y: 60 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: '5v', label: '5V', type: 'power', group: 'power', position: { x: 100, y: 70 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: '3v3', label: '3.3V', type: 'power', group: 'power', position: { x: 100, y: 80 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'gnd', label: 'GND', type: 'ground', group: 'ground', position: { x: 100, y: 90 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'vin', label: 'VIN', type: 'power', group: 'power', position: { x: 100, y: 100 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'rst', label: 'RST', type: 'digital', group: 'control', position: { x: 100, y: 110 }, direction: 'right', futureActiveStateHints: {} },
      ],
      labelPositions: [{ labelId: 'name', text: 'Arduino Uno', x: 50, y: 60 }],
      interactionZones: [{ zoneId: 'body', kind: 'hover', x: 0, y: 0, width: 100, height: 120 }],
      futureAnimationHints: {}, futureSkinHints: {}, futureThemeHints: {},
    },
    'ARDUINO_NANO': {
      modelId: 'arduino-nano-default', componentType: 'ARDUINO_NANO', displayName: 'Arduino Nano', category: 'BOARD', defaultWidth: 50, defaultHeight: 70,
      anchorPoints: [
        { anchorId: 'center', x: 25, y: 35 },
        { anchorId: 'top', x: 25, y: 0 },
      ],
      pinVisualMetadata: [
        { pinId: 'd0', label: 'D0/RX', type: 'digital', group: 'gpio', position: { x: 0, y: 5 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'd1', label: 'D1/TX', type: 'digital', group: 'gpio', position: { x: 0, y: 15 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'd2', label: 'D2', type: 'digital', group: 'gpio', position: { x: 0, y: 25 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'd3', label: 'D3', type: 'pwm', group: 'gpio', position: { x: 0, y: 35 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'd4', label: 'D4', type: 'digital', group: 'gpio', position: { x: 0, y: 45 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'd5', label: 'D5', type: 'pwm', group: 'gpio', position: { x: 0, y: 55 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'd6', label: 'D6', type: 'pwm', group: 'gpio', position: { x: 0, y: 65 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'a0', label: 'A0', type: 'analog', group: 'analog', position: { x: 50, y: 5 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'a1', label: 'A1', type: 'analog', group: 'analog', position: { x: 50, y: 15 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'a2', label: 'A2', type: 'analog', group: 'analog', position: { x: 50, y: 25 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'a3', label: 'A3', type: 'analog', group: 'analog', position: { x: 50, y: 35 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: '5v', label: '5V', type: 'power', group: 'power', position: { x: 50, y: 45 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: '3v3', label: '3.3V', type: 'power', group: 'power', position: { x: 50, y: 55 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'gnd', label: 'GND', type: 'ground', group: 'ground', position: { x: 50, y: 65 }, direction: 'right', futureActiveStateHints: {} },
      ],
      labelPositions: [{ labelId: 'name', text: 'Nano', x: 25, y: 35 }],
      interactionZones: [{ zoneId: 'body', kind: 'hover', x: 0, y: 0, width: 50, height: 70 }],
      futureAnimationHints: {}, futureSkinHints: {}, futureThemeHints: {},
    },
    'RASPBERRY_PI_PICO': {
      modelId: 'pico-default', componentType: 'RASPBERRY_PI_PICO', displayName: 'Raspberry Pi Pico', category: 'BOARD', defaultWidth: 40, defaultHeight: 80,
      anchorPoints: [
        { anchorId: 'center', x: 20, y: 40 },
        { anchorId: 'top', x: 20, y: 0 },
      ],
      pinVisualMetadata: [
        { pinId: 'gpio0', label: 'GP0', type: 'digital', group: 'gpio', position: { x: 0, y: 5 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gpio1', label: 'GP1', type: 'digital', group: 'gpio', position: { x: 0, y: 15 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gnd', label: 'GND', type: 'ground', group: 'ground', position: { x: 0, y: 25 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gpio2', label: 'GP2', type: 'digital', group: 'gpio', position: { x: 0, y: 35 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gpio3', label: 'GP3', type: 'digital', group: 'gpio', position: { x: 0, y: 45 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gpio4', label: 'GP4', type: 'digital', group: 'gpio', position: { x: 0, y: 55 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gpio5', label: 'GP5', type: 'digital', group: 'gpio', position: { x: 0, y: 65 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gpio6', label: 'GP6', type: 'digital', group: 'gpio', position: { x: 0, y: 75 }, direction: 'left', futureActiveStateHints: {} },
        { pinId: 'gpio7', label: 'GP7', type: 'digital', group: 'gpio', position: { x: 40, y: 5 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'gpio8', label: 'GP8', type: 'digital', group: 'gpio', position: { x: 40, y: 15 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'gpio9', label: 'GP9', type: 'digital', group: 'gpio', position: { x: 40, y: 25 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'gpio10', label: 'GP10', type: 'digital', group: 'gpio', position: { x: 40, y: 35 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'gpio11', label: 'GP11', type: 'digital', group: 'gpio', position: { x: 40, y: 45 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'gpio12', label: 'GP12', type: 'digital', group: 'gpio', position: { x: 40, y: 55 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'gpio13', label: 'GP13', type: 'digital', group: 'gpio', position: { x: 40, y: 65 }, direction: 'right', futureActiveStateHints: {} },
        { pinId: 'gpio14', label: 'GP14', type: 'digital', group: 'gpio', position: { x: 40, y: 75 }, direction: 'right', futureActiveStateHints: {} },
      ],
      labelPositions: [{ labelId: 'name', text: 'Pico', x: 20, y: 40 }],
      interactionZones: [{ zoneId: 'body', kind: 'hover', x: 0, y: 0, width: 40, height: 80 }],
      futureAnimationHints: {}, futureSkinHints: {}, futureThemeHints: {},
    },
  };

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

  private static readonly VALID_STEMVERSE_VISUAL_TYPES: STEMVerseVisualType[] = ['LED', 'BUTTON', 'BUZZER', 'SERVO', 'ULTRASONIC', 'LCD', 'OLED', 'ESP32', 'ARDUINO_UNO', 'ARDUINO_NANO', 'RASPBERRY_PI_PICO', 'BREADBOARD', 'SENSOR', 'ACTUATOR', 'MOTOR', 'RELAY', 'DISPLAY'];
  private static readonly VALID_STEMVERSE_BOARD_STATUSES: STEMVerseBoardStatus[] = ['IDLE', 'ACTIVE', 'WARNING', 'ERROR', 'DISABLED'];
  private static readonly VALID_STEMVERSE_SIGNAL_DIRECTIONS: STEMVerseSignalFlowDirection[] = ['NONE', 'FORWARD', 'REVERSE', 'BIDIRECTIONAL'];
  private static readonly VALID_STEMVERSE_THEME_MODES: STEMVerseVisualThemeMode[] = ['LIGHT', 'DARK', 'HIGH_CONTRAST', 'CLASSROOM'];

  private validateStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(entry => typeof entry === 'string');
  }

  private validateStemverseVisualState(state: STEMVerseVisualState): boolean {
    if (!state || typeof state.visualId !== 'string' || state.visualId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed STEMVerse visual metadata: Visual state is missing a valid visualId.');
      return false;
    }
    if (!BaseRuntime.VALID_STEMVERSE_VISUAL_TYPES.includes(state.visualType)) {
      console.warn(`[Runtime Diagnostics] invalid STEMVerse visual types: Visual state "${state.visualId}" has invalid type "${(state as any).visualType}".`);
      return false;
    }
    for (const field of ['visibility', 'selected', 'hovered', 'active', 'highlighted', 'disabled'] as const) {
      if (typeof state[field] !== 'boolean') {
        console.warn(`[Runtime Diagnostics] malformed STEMVerse visual metadata: Visual state "${state.visualId}" has invalid ${field}.`);
        return false;
      }
    }
    if (!state.transform || typeof state.transform.x !== 'number' || typeof state.transform.y !== 'number' || typeof state.transform.rotation !== 'number' || typeof state.transform.scale !== 'number' || !Number.isFinite(state.transform.x) || !Number.isFinite(state.transform.y) || !Number.isFinite(state.transform.rotation) || !Number.isFinite(state.transform.scale)) {
      console.warn(`[Runtime Diagnostics] invalid STEMVerse visual coordinates: Visual state "${state.visualId}" has invalid transform.`);
      return false;
    }
    if (state.transform.scale <= 0) {
      console.warn(`[Runtime Diagnostics] invalid STEMVerse visual scales: Visual state "${state.visualId}" has non-positive scale.`);
      return false;
    }
    if (typeof state.layer !== 'string' || state.layer.length === 0 || typeof state.zIndex !== 'number' || !Number.isFinite(state.zIndex)) {
      console.warn(`[Runtime Diagnostics] invalid STEMVerse visual layers: Visual state "${state.visualId}" has invalid layer metadata.`);
      return false;
    }
    if (state.futureModelType !== undefined && typeof state.futureModelType !== 'string') return false;
    if (state.futureSkinType !== undefined && typeof state.futureSkinType !== 'string') return false;
    if (!this.validatePlainObject(state.metadata)) {
      console.warn(`[Runtime Diagnostics] malformed STEMVerse visual metadata: Visual state "${state.visualId}" has invalid metadata.`);
      return false;
    }
    if (state.boardVisual) {
      if (!this.validateStringArray(state.boardVisual.activePins) || !this.validateStringArray(state.boardVisual.highlightedPins) || !this.validateStringArray(state.boardVisual.hoveredPins) || !this.validateStringArray(state.boardVisual.selectedPins) || !BaseRuntime.VALID_STEMVERSE_BOARD_STATUSES.includes(state.boardVisual.boardStatus) || !Array.isArray(state.boardVisual.futureExpansionZones)) {
        console.warn(`[Runtime Diagnostics] malformed STEMVerse board visual metadata: Visual state "${state.visualId}" has invalid board visual state.`);
        return false;
      }
    }
    if (state.wireVisual) {
      if (typeof state.wireVisual.wireSelected !== 'boolean' || typeof state.wireVisual.wireHighlighted !== 'boolean' || typeof state.wireVisual.wireActive !== 'boolean' || !BaseRuntime.VALID_STEMVERSE_SIGNAL_DIRECTIONS.includes(state.wireVisual.signalFlowDirection) || !this.validatePlainObject(state.wireVisual.futureAnimationHints)) {
        console.warn(`[Runtime Diagnostics] malformed STEMVerse wire visual metadata: Visual state "${state.visualId}" has invalid wire visual state.`);
        return false;
      }
    }
    return true;
  }

  public registerSTEMVerseVisualState(state: STEMVerseVisualState): void {
    if (!this.validateStemverseVisualState(state)) return;
    if (this.stemverseVisualRegistry.has(state.visualId)) {
      console.warn(`[Runtime Diagnostics] duplicate STEMVerse visual IDs: Visual ID "${state.visualId}" already exists.`);
    }
    this.stemverseVisualRegistry.set(state.visualId, JSON.parse(JSON.stringify(state)));
    if (!this.stemverseVisualOrder.includes(state.visualId)) this.stemverseVisualOrder.push(state.visualId);
  }

  public updateSTEMVerseVisualState(id: string, updates: Partial<STEMVerseVisualState>): void {
    const existing = this.stemverseVisualRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing STEMVerse visual metadata: Visual state "${id}" not found.`);
      return;
    }
    this.registerSTEMVerseVisualState({ ...existing, ...updates, visualId: existing.visualId, transform: updates.transform ? { ...updates.transform } : { ...existing.transform }, metadata: updates.metadata ? JSON.parse(JSON.stringify(updates.metadata)) : JSON.parse(JSON.stringify(existing.metadata)) });
  }

  public removeSTEMVerseVisualState(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed STEMVerse visual metadata: Visual ID must be a non-empty string.');
      return;
    }
    this.stemverseVisualRegistry.delete(id);
    this.stemverseVisualOrder = this.stemverseVisualOrder.filter(existing => existing !== id);
  }

  public getSTEMVerseVisualState(id: string): STEMVerseVisualState | undefined {
    const state = this.stemverseVisualRegistry.get(id);
    return state ? JSON.parse(JSON.stringify(state)) : undefined;
  }

  public getSTEMVerseVisualStates(): STEMVerseVisualState[] {
    return this.stemverseVisualOrder.map(id => this.stemverseVisualRegistry.get(id)).filter((state): state is STEMVerseVisualState => !!state).map(state => JSON.parse(JSON.stringify(state)));
  }

  public clearSTEMVerseVisualStates(): void {
    this.stemverseVisualRegistry.clear();
    this.stemverseVisualOrder = [];
  }

  public setSTEMVerseVisualTheme(theme: STEMVerseVisualThemeState): void {
    if (!theme || typeof theme.themeId !== 'string' || theme.themeId.length === 0 || !BaseRuntime.VALID_STEMVERSE_THEME_MODES.includes(theme.mode) || typeof theme.classroomMode !== 'boolean' || typeof theme.highContrast !== 'boolean' || !this.validatePlainObject(theme.metadata)) {
      console.warn('[Runtime Diagnostics] malformed STEMVerse visual theme metadata: Theme is invalid.');
      return;
    }
    this.stemverseVisualTheme = JSON.parse(JSON.stringify(theme));
  }

  public getSTEMVerseVisualTheme(): STEMVerseVisualThemeState {
    return JSON.parse(JSON.stringify(this.stemverseVisualTheme));
  }

  // ─── Phase 10B: Component Visual Model Registry ────────────

  private validateComponentVisualModel(model: ComponentVisualModel): boolean {
    if (!model || typeof model.modelId !== 'string' || model.modelId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed component visual model: Model is missing a valid modelId.');
      return false;
    }
    if (!BaseRuntime.VALID_COMPONENT_VISUAL_TYPES.includes(model.componentType)) {
      console.warn(`[Runtime Diagnostics] invalid component visual types: Model "${model.modelId}" has invalid componentType "${model.componentType}".`);
      return false;
    }
    if (typeof model.displayName !== 'string' || model.displayName.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed component visual model: Model "${model.modelId}" has invalid displayName.`);
      return false;
    }
    if (!BaseRuntime.VALID_COMPONENT_VISUAL_CATEGORIES.includes(model.category)) {
      console.warn(`[Runtime Diagnostics] invalid component visual categories: Model "${model.modelId}" has invalid category "${model.category}".`);
      return false;
    }
    if (typeof model.defaultWidth !== 'number' || !Number.isFinite(model.defaultWidth) || model.defaultWidth <= 0 ||
        typeof model.defaultHeight !== 'number' || !Number.isFinite(model.defaultHeight) || model.defaultHeight <= 0) {
      console.warn(`[Runtime Diagnostics] invalid component visual dimensions: Model "${model.modelId}" has invalid dimensions.`);
      return false;
    }
    if (!Array.isArray(model.anchorPoints)) {
      console.warn(`[Runtime Diagnostics] invalid component visual anchors: Model "${model.modelId}" has invalid anchorPoints.`);
      return false;
    }
    for (const anchor of model.anchorPoints) {
      if (!anchor || typeof anchor.anchorId !== 'string' || anchor.anchorId.length === 0 || typeof anchor.x !== 'number' || typeof anchor.y !== 'number') {
        console.warn(`[Runtime Diagnostics] invalid component visual anchors: Model "${model.modelId}" has malformed anchor entries.`);
        return false;
      }
    }
    if (!Array.isArray(model.pinVisualMetadata)) {
      console.warn(`[Runtime Diagnostics] invalid component visual pins: Model "${model.modelId}" has invalid pinVisualMetadata.`);
      return false;
    }
    for (const pin of model.pinVisualMetadata) {
      if (!pin || typeof pin.pinId !== 'string' || pin.pinId.length === 0 || typeof pin.label !== 'string' || pin.label.length === 0 || typeof pin.type !== 'string' || pin.type.length === 0 || typeof pin.group !== 'string' || pin.group.length === 0 || !pin.position || typeof pin.position.x !== 'number' || typeof pin.position.y !== 'number' || typeof pin.direction !== 'string' || pin.direction.length === 0) {
        console.warn(`[Runtime Diagnostics] invalid component visual pins: Model "${model.modelId}" has malformed pin metadata.`);
        return false;
      }
    }
    if (!Array.isArray(model.labelPositions)) {
      console.warn(`[Runtime Diagnostics] invalid component visual labels: Model "${model.modelId}" has invalid labelPositions.`);
      return false;
    }
    for (const label of model.labelPositions) {
      if (!label || typeof label.labelId !== 'string' || label.labelId.length === 0 || typeof label.text !== 'string' || label.text.length === 0 || typeof label.x !== 'number' || typeof label.y !== 'number') {
        console.warn(`[Runtime Diagnostics] invalid component visual labels: Model "${model.modelId}" has malformed label entries.`);
        return false;
      }
    }
    if (!Array.isArray(model.interactionZones)) {
      console.warn(`[Runtime Diagnostics] invalid component visual zones: Model "${model.modelId}" has invalid interactionZones.`);
      return false;
    }
    for (const zone of model.interactionZones) {
      if (!zone || typeof zone.zoneId !== 'string' || zone.zoneId.length === 0 || !BaseRuntime.VALID_INTERACTION_ZONE_KINDS.includes(zone.kind as any) || typeof zone.x !== 'number' || typeof zone.y !== 'number' || typeof zone.width !== 'number' || typeof zone.height !== 'number') {
        console.warn(`[Runtime Diagnostics] invalid component visual zones: Model "${model.modelId}" has malformed interaction zone entries.`);
        return false;
      }
    }
    if (typeof model.futureAnimationHints !== 'object' || model.futureAnimationHints === null || Array.isArray(model.futureAnimationHints)) {
      console.warn(`[Runtime Diagnostics] malformed component visual model: Model "${model.modelId}" has invalid futureAnimationHints.`);
      return false;
    }
    if (typeof model.futureSkinHints !== 'object' || model.futureSkinHints === null || Array.isArray(model.futureSkinHints)) {
      console.warn(`[Runtime Diagnostics] malformed component visual model: Model "${model.modelId}" has invalid futureSkinHints.`);
      return false;
    }
    if (typeof model.futureThemeHints !== 'object' || model.futureThemeHints === null || Array.isArray(model.futureThemeHints)) {
      console.warn(`[Runtime Diagnostics] malformed component visual model: Model "${model.modelId}" has invalid futureThemeHints.`);
      return false;
    }
    return true;
  }

  public registerComponentVisualModel(model: ComponentVisualModel): void {
    if (!this.validateComponentVisualModel(model)) return;
    if (this.componentVisualModelRegistry.has(model.modelId)) {
      console.warn(`[Runtime Diagnostics] duplicate component visual model IDs: Model ID "${model.modelId}" already exists.`);
    }
    this.componentVisualModelRegistry.set(model.modelId, JSON.parse(JSON.stringify(model)));
    if (!this.componentVisualModelOrder.includes(model.modelId)) {
      this.componentVisualModelOrder.push(model.modelId);
    }
  }

  public getComponentVisualModel(id: string): ComponentVisualModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed component visual model: Model ID must be a non-empty string.');
      return undefined;
    }
    const model = this.componentVisualModelRegistry.get(id);
    return model ? JSON.parse(JSON.stringify(model)) : undefined;
  }

  public getComponentVisualModels(): ComponentVisualModel[] {
    return this.componentVisualModelOrder
      .map(id => this.componentVisualModelRegistry.get(id))
      .filter((model): model is ComponentVisualModel => !!model)
      .map(model => JSON.parse(JSON.stringify(model)));
  }

  public updateComponentVisualModel(id: string, updates: Partial<ComponentVisualModel>): void {
    const existing = this.componentVisualModelRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing component visual model: Model "${id}" not found.`);
      return;
    }
    this.registerComponentVisualModel({ ...existing, ...updates, modelId: existing.modelId, anchorPoints: updates.anchorPoints ? JSON.parse(JSON.stringify(updates.anchorPoints)) : JSON.parse(JSON.stringify(existing.anchorPoints)), pinVisualMetadata: updates.pinVisualMetadata ? JSON.parse(JSON.stringify(updates.pinVisualMetadata)) : JSON.parse(JSON.stringify(existing.pinVisualMetadata)), labelPositions: updates.labelPositions ? JSON.parse(JSON.stringify(updates.labelPositions)) : JSON.parse(JSON.stringify(existing.labelPositions)), interactionZones: updates.interactionZones ? JSON.parse(JSON.stringify(updates.interactionZones)) : JSON.parse(JSON.stringify(existing.interactionZones)), futureAnimationHints: updates.futureAnimationHints ? JSON.parse(JSON.stringify(updates.futureAnimationHints)) : JSON.parse(JSON.stringify(existing.futureAnimationHints)), futureSkinHints: updates.futureSkinHints ? JSON.parse(JSON.stringify(updates.futureSkinHints)) : JSON.parse(JSON.stringify(existing.futureSkinHints)), futureThemeHints: updates.futureThemeHints ? JSON.parse(JSON.stringify(updates.futureThemeHints)) : JSON.parse(JSON.stringify(existing.futureThemeHints)) });
  }

  public removeComponentVisualModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed component visual model: Model ID must be a non-empty string.');
      return;
    }
    this.componentVisualModelRegistry.delete(id);
    this.componentVisualModelOrder = this.componentVisualModelOrder.filter(existing => existing !== id);
  }

  public clearComponentVisualModels(): void {
    this.componentVisualModelRegistry.clear();
    this.componentVisualModelOrder = [];
  }

  public getComponentVisualModelKeys(): string[] {
    return [...this.componentVisualModelOrder];
  }

  // ─── Phase 10C: Wire Visualization Registry ────────────

  private validateWireVisualModel(model: WireVisualModel): boolean {
    if (!model || typeof model.wireId !== 'string' || model.wireId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed wire visual model: Model is missing a valid wireId.');
      return false;
    }
    if (!BaseRuntime.VALID_WIRE_TYPES.includes(model.wireType)) {
      console.warn(`[Runtime Diagnostics] invalid wire types: Model "${model.wireId}" has invalid wireType "${model.wireType}".`);
      return false;
    }
    if (typeof model.displayName !== 'string' || model.displayName.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed wire visual model: Model "${model.wireId}" has invalid displayName.`);
      return false;
    }
    if (!BaseRuntime.VALID_WIRE_CATEGORIES.includes(model.category)) {
      console.warn(`[Runtime Diagnostics] invalid wire categories: Model "${model.wireId}" has invalid category "${model.category}".`);
      return false;
    }
    if (typeof model.defaultStyle !== 'string' || model.defaultStyle.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed wire visual model: Model "${model.wireId}" has invalid defaultStyle.`);
      return false;
    }
    if (typeof model.defaultThickness !== 'number' || !Number.isFinite(model.defaultThickness) || model.defaultThickness <= 0) {
      console.warn(`[Runtime Diagnostics] invalid wire thickness: Model "${model.wireId}" has invalid defaultThickness "${model.defaultThickness}".`);
      return false;
    }
    if (!BaseRuntime.VALID_ROUTING_PATH_TYPES.includes(model.defaultRoutingMode)) {
      console.warn(`[Runtime Diagnostics] invalid routing modes: Model "${model.wireId}" has invalid defaultRoutingMode "${model.defaultRoutingMode}".`);
      return false;
    }
    if (!this.validatePlainObject(model.futureAnimationHints)) {
      console.warn(`[Runtime Diagnostics] malformed wire visual model: Model "${model.wireId}" has invalid futureAnimationHints.`);
      return false;
    }
    if (!this.validatePlainObject(model.futureSignalHints)) {
      console.warn(`[Runtime Diagnostics] malformed wire visual model: Model "${model.wireId}" has invalid futureSignalHints.`);
      return false;
    }
    if (!this.validatePlainObject(model.futureThemeHints)) {
      console.warn(`[Runtime Diagnostics] malformed wire visual model: Model "${model.wireId}" has invalid futureThemeHints.`);
      return false;
    }
    return true;
  }

  private validateControlPoints(points: ControlPoint[], wireId: string): boolean {
    if (!Array.isArray(points)) {
      console.warn(`[Runtime Diagnostics] invalid control points: Wire "${wireId}" has non-array controlPoints.`);
      return false;
    }
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (!pt || typeof pt.x !== 'number' || !Number.isFinite(pt.x) || typeof pt.y !== 'number' || !Number.isFinite(pt.y)) {
        console.warn(`[Runtime Diagnostics] invalid control points: Wire "${wireId}" has invalid control point at index ${i}.`);
        return false;
      }
    }
    return true;
  }

  private validateWireRoutingMetadata(routing: WireRoutingMetadata, wireId: string): boolean {
    if (!routing || typeof routing !== 'object') {
      console.warn(`[Runtime Diagnostics] malformed wire routing: Wire "${wireId}" has invalid routing metadata.`);
      return false;
    }
    if (typeof routing.sourceAnchor !== 'string' || routing.sourceAnchor.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed wire routing: Wire "${wireId}" has invalid sourceAnchor.`);
      return false;
    }
    if (typeof routing.targetAnchor !== 'string' || routing.targetAnchor.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed wire routing: Wire "${wireId}" has invalid targetAnchor.`);
      return false;
    }
    if (!this.validateControlPoints(routing.controlPoints, wireId)) return false;
    if (!BaseRuntime.VALID_ROUTING_PATH_TYPES.includes(routing.preferredPathType)) {
      console.warn(`[Runtime Diagnostics] invalid routing path types: Wire "${wireId}" has invalid preferredPathType "${routing.preferredPathType}".`);
      return false;
    }
    if (!this.validatePlainObject(routing.routingHints)) {
      console.warn(`[Runtime Diagnostics] malformed wire routing: Wire "${wireId}" has invalid routingHints.`);
      return false;
    }
    if (!this.validatePlainObject(routing.futureAutoRoutingHints)) {
      console.warn(`[Runtime Diagnostics] malformed wire routing: Wire "${wireId}" has invalid futureAutoRoutingHints.`);
      return false;
    }
    return true;
  }

  private validateSignalVisualizationMetadata(signal: SignalVisualizationMetadata, wireId: string): boolean {
    if (!signal || typeof signal !== 'object') {
      console.warn(`[Runtime Diagnostics] malformed signal visualization: Wire "${wireId}" has invalid signal metadata.`);
      return false;
    }
    if (!BaseRuntime.VALID_SIGNAL_DIRECTIONS.includes(signal.signalDirection)) {
      console.warn(`[Runtime Diagnostics] invalid signal directions: Wire "${wireId}" has invalid signalDirection "${signal.signalDirection}".`);
      return false;
    }
    if (!BaseRuntime.VALID_SIGNAL_ACTIVITIES.includes(signal.signalActivity)) {
      console.warn(`[Runtime Diagnostics] invalid signal activities: Wire "${wireId}" has invalid signalActivity "${signal.signalActivity}".`);
      return false;
    }
    if (!BaseRuntime.VALID_SIGNAL_STATES.includes(signal.signalState)) {
      console.warn(`[Runtime Diagnostics] invalid signal states: Wire "${wireId}" has invalid signalState "${signal.signalState}".`);
      return false;
    }
    if (!this.validatePlainObject(signal.futureFlowAnimationHints)) {
      console.warn(`[Runtime Diagnostics] malformed signal visualization: Wire "${wireId}" has invalid futureFlowAnimationHints.`);
      return false;
    }
    if (!this.validatePlainObject(signal.futurePulseHints)) {
      console.warn(`[Runtime Diagnostics] malformed signal visualization: Wire "${wireId}" has invalid futurePulseHints.`);
      return false;
    }
    return true;
  }

  private validateInteractionZoneRects(zones: InteractionZoneRect[], label: string, wireId: string): boolean {
    if (!Array.isArray(zones)) {
      console.warn(`[Runtime Diagnostics] invalid interaction zones: Wire "${wireId}" has non-array ${label}.`);
      return false;
    }
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i];
      if (!z || typeof z.zoneId !== 'string' || z.zoneId.length === 0 || !BaseRuntime.VALID_INTERACTION_ZONE_RECT_KINDS.includes(z.kind as any) || typeof z.x !== 'number' || typeof z.y !== 'number' || typeof z.width !== 'number' || typeof z.height !== 'number') {
        console.warn(`[Runtime Diagnostics] invalid interaction zones: Wire "${wireId}" has invalid ${label} entry at index ${i}.`);
        return false;
      }
    }
    return true;
  }

  private validateWireInteractionMetadata(interaction: WireInteractionMetadata, wireId: string): boolean {
    if (!interaction || typeof interaction !== 'object') {
      console.warn(`[Runtime Diagnostics] malformed wire interaction: Wire "${wireId}" has invalid interaction metadata.`);
      return false;
    }
    if (!this.validateInteractionZoneRects(interaction.hoverZones, 'hoverZones', wireId)) return false;
    if (!this.validateInteractionZoneRects(interaction.selectionZones, 'selectionZones', wireId)) return false;
    if (!this.validateInteractionZoneRects(interaction.dragHandles, 'dragHandles', wireId)) return false;
    if (!this.validateInteractionZoneRects(interaction.routingHandles, 'routingHandles', wireId)) return false;
    if (!this.validateInteractionZoneRects(interaction.focusRegions, 'focusRegions', wireId)) return false;
    return true;
  }

  private validateWireVisualRegistryEntry(entry: WireVisualRegistryEntry): boolean {
    if (!entry || typeof entry.wireId !== 'string' || entry.wireId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed wire visual registry entry: Entry is missing a valid wireId.');
      return false;
    }
    if (!this.validateWireVisualModel(entry.visualModel)) return false;
    if (!this.validateWireRoutingMetadata(entry.routing, entry.wireId)) return false;
    if (!this.validateSignalVisualizationMetadata(entry.signal, entry.wireId)) return false;
    if (!this.validateWireInteractionMetadata(entry.interaction, entry.wireId)) return false;
    return true;
  }

  public registerWireVisualEntry(entry: WireVisualRegistryEntry): void {
    if (!this.validateWireVisualRegistryEntry(entry)) return;
    if (this.wireVisualRegistry.has(entry.wireId)) {
      console.warn(`[Runtime Diagnostics] duplicate wire visual entry IDs: Wire ID "${entry.wireId}" already exists.`);
    }
    this.wireVisualRegistry.set(entry.wireId, JSON.parse(JSON.stringify(entry)));
    if (!this.wireVisualOrder.includes(entry.wireId)) {
      this.wireVisualOrder.push(entry.wireId);
    }
  }

  public getWireVisualEntry(id: string): WireVisualRegistryEntry | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed wire visual entry: Wire ID must be a non-empty string.');
      return undefined;
    }
    const entry = this.wireVisualRegistry.get(id);
    return entry ? JSON.parse(JSON.stringify(entry)) : undefined;
  }

  public getWireVisualEntries(): WireVisualRegistryEntry[] {
    return this.wireVisualOrder
      .map(id => this.wireVisualRegistry.get(id))
      .filter((entry): entry is WireVisualRegistryEntry => !!entry)
      .map(entry => JSON.parse(JSON.stringify(entry)));
  }

  public updateWireVisualEntry(id: string, updates: Partial<WireVisualRegistryEntry>): void {
    const existing = this.wireVisualRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing wire visual entry: Wire "${id}" not found.`);
      return;
    }
    const merged: WireVisualRegistryEntry = {
      ...existing,
      ...updates,
      wireId: existing.wireId,
      visualModel: updates.visualModel ? { ...existing.visualModel, ...updates.visualModel } : { ...existing.visualModel },
      routing: updates.routing ? { ...existing.routing, ...updates.routing, controlPoints: updates.routing.controlPoints ? updates.routing.controlPoints.map(p => ({ ...p })) : existing.routing.controlPoints.map(p => ({ ...p })) } : { ...existing.routing, controlPoints: existing.routing.controlPoints.map(p => ({ ...p })) },
      signal: updates.signal ? { ...existing.signal, ...updates.signal } : { ...existing.signal },
      interaction: updates.interaction ? { ...existing.interaction, ...updates.interaction } : { ...existing.interaction },
    };
    this.registerWireVisualEntry(merged);
  }

  public removeWireVisualEntry(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed wire visual entry: Wire ID must be a non-empty string.');
      return;
    }
    this.wireVisualRegistry.delete(id);
    this.wireVisualOrder = this.wireVisualOrder.filter(existing => existing !== id);
  }

  public clearWireVisualRegistry(): void {
    this.wireVisualRegistry.clear();
    this.wireVisualOrder = [];
  }

  public getWireVisualKeys(): string[] {
    return [...this.wireVisualOrder];
  }

  public hasWireVisual(id: string): boolean {
    return this.wireVisualRegistry.has(id);
  }

  // ─── Phase 10D: Board Visual Registry ────────────

  private validateBoardLayoutMetadata(layout: BoardLayoutMetadata, boardVisualId: string): boolean {
    if (!layout || typeof layout !== 'object') {
      console.warn(`[Runtime Diagnostics] malformed board layout: Board "${boardVisualId}" has invalid layout.`);
      return false;
    }
    if (!layout.boardBounds || typeof layout.boardBounds.x !== 'number' || typeof layout.boardBounds.y !== 'number' || typeof layout.boardBounds.width !== 'number' || typeof layout.boardBounds.height !== 'number') {
      console.warn(`[Runtime Diagnostics] malformed board layout: Board "${boardVisualId}" has invalid boardBounds.`);
      return false;
    }
    if (!Array.isArray(layout.componentRegions)) {
      console.warn(`[Runtime Diagnostics] malformed board layout: Board "${boardVisualId}" has invalid componentRegions.`);
      return false;
    }
    if (!Array.isArray(layout.powerRegions)) {
      console.warn(`[Runtime Diagnostics] malformed board layout: Board "${boardVisualId}" has invalid powerRegions.`);
      return false;
    }
    if (!Array.isArray(layout.signalRegions)) {
      console.warn(`[Runtime Diagnostics] malformed board layout: Board "${boardVisualId}" has invalid signalRegions.`);
      return false;
    }
    if (!Array.isArray(layout.reservedRegions)) {
      console.warn(`[Runtime Diagnostics] malformed board layout: Board "${boardVisualId}" has invalid reservedRegions.`);
      return false;
    }
    if (!this.validatePlainObject(layout.futurePlacementHints)) {
      console.warn(`[Runtime Diagnostics] malformed board layout: Board "${boardVisualId}" has invalid futurePlacementHints.`);
      return false;
    }
    return true;
  }

  private validateBoardInteractionMetadata(interaction: BoardInteractionMetadata, boardVisualId: string): boolean {
    if (!interaction || typeof interaction !== 'object') {
      console.warn(`[Runtime Diagnostics] malformed board interaction: Board "${boardVisualId}" has invalid interaction metadata.`);
      return false;
    }
    if (!this.validateBoardInteractionZones(interaction.hoverZones, 'hoverZones', boardVisualId)) return false;
    if (!this.validateBoardInteractionZones(interaction.selectionZones, 'selectionZones', boardVisualId)) return false;
    if (!this.validateBoardInteractionZones(interaction.dragZones, 'dragZones', boardVisualId)) return false;
    if (!this.validateBoardInteractionZones(interaction.focusZones, 'focusZones', boardVisualId)) return false;
    if (!this.validateBoardInteractionZones(interaction.futureEditingZones, 'futureEditingZones', boardVisualId)) return false;
    return true;
  }

  private validateBoardInteractionZones(zones: BoardInteractionZone[], label: string, boardVisualId: string): boolean {
    if (!Array.isArray(zones)) {
      console.warn(`[Runtime Diagnostics] invalid board interaction zones: Board "${boardVisualId}" has non-array ${label}.`);
      return false;
    }
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i];
      if (!z || typeof z.zoneId !== 'string' || z.zoneId.length === 0 || !BaseRuntime.VALID_BOARD_INTERACTION_ZONE_KINDS.includes(z.kind as any) || typeof z.x !== 'number' || typeof z.y !== 'number' || typeof z.width !== 'number' || typeof z.height !== 'number') {
        console.warn(`[Runtime Diagnostics] invalid board interaction zones: Board "${boardVisualId}" has invalid ${label} entry at index ${i}.`);
        return false;
      }
    }
    return true;
  }

  private validateBoardVisualModel(model: BoardVisualModel): boolean {
    if (!model || typeof model.boardVisualId !== 'string' || model.boardVisualId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed board visual model: Model is missing a valid boardVisualId.');
      return false;
    }
    if (!BaseRuntime.VALID_BOARD_VISUAL_TYPES.includes(model.boardType)) {
      console.warn(`[Runtime Diagnostics] invalid board visual types: Model "${model.boardVisualId}" has invalid boardType "${model.boardType}".`);
      return false;
    }
    if (typeof model.displayName !== 'string' || model.displayName.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed board visual model: Model "${model.boardVisualId}" has invalid displayName.`);
      return false;
    }
    if (!BaseRuntime.VALID_BOARD_VISUAL_CATEGORIES.includes(model.category)) {
      console.warn(`[Runtime Diagnostics] invalid board visual categories: Model "${model.boardVisualId}" has invalid category "${model.category}".`);
      return false;
    }
    if (typeof model.defaultWidth !== 'number' || !Number.isFinite(model.defaultWidth) || model.defaultWidth <= 0 ||
        typeof model.defaultHeight !== 'number' || !Number.isFinite(model.defaultHeight) || model.defaultHeight <= 0) {
      console.warn(`[Runtime Diagnostics] invalid board visual dimensions: Model "${model.boardVisualId}" has invalid dimensions.`);
      return false;
    }
    if (!this.validatePlainObject(model.outlineMetadata)) {
      console.warn(`[Runtime Diagnostics] malformed board visual model: Model "${model.boardVisualId}" has invalid outlineMetadata.`);
      return false;
    }
    if (!this.validatePlainObject(model.mountingMetadata)) {
      console.warn(`[Runtime Diagnostics] malformed board visual model: Model "${model.boardVisualId}" has invalid mountingMetadata.`);
      return false;
    }
    if (!Array.isArray(model.connectorMetadata)) {
      console.warn(`[Runtime Diagnostics] malformed board visual model: Model "${model.boardVisualId}" has invalid connectorMetadata.`);
      return false;
    }
    for (const conn of model.connectorMetadata) {
      if (!conn || typeof conn.connectorId !== 'string' || conn.connectorId.length === 0 || typeof conn.connectorType !== 'string' || conn.connectorType.length === 0 || !conn.position || typeof conn.position.x !== 'number' || typeof conn.position.y !== 'number' || typeof conn.direction !== 'string' || conn.direction.length === 0 || typeof conn.label !== 'string' || typeof conn.group !== 'string') {
        console.warn(`[Runtime Diagnostics] invalid board visual connectors: Model "${model.boardVisualId}" has malformed connector entry.`);
        return false;
      }
    }
    if (!this.validatePlainObject(model.labelMetadata)) {
      console.warn(`[Runtime Diagnostics] malformed board visual model: Model "${model.boardVisualId}" has invalid labelMetadata.`);
      return false;
    }
    if (!this.validatePlainObject(model.futureThemeHints)) {
      console.warn(`[Runtime Diagnostics] malformed board visual model: Model "${model.boardVisualId}" has invalid futureThemeHints.`);
      return false;
    }
    if (!this.validatePlainObject(model.futureAnimationHints)) {
      console.warn(`[Runtime Diagnostics] malformed board visual model: Model "${model.boardVisualId}" has invalid futureAnimationHints.`);
      return false;
    }
    return true;
  }

  private validateBoardVisualRegistryEntry(entry: BoardVisualRegistryEntry): boolean {
    if (!entry || typeof entry.boardVisualId !== 'string' || entry.boardVisualId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed board visual registry entry: Entry is missing a valid boardVisualId.');
      return false;
    }
    if (!this.validateBoardVisualModel(entry.visualModel)) return false;
    if (!this.validateBoardLayoutMetadata(entry.layout, entry.boardVisualId)) return false;
    if (!this.validateBoardInteractionMetadata(entry.interaction, entry.boardVisualId)) return false;
    return true;
  }

  public registerBoardVisualEntry(entry: BoardVisualRegistryEntry): void {
    if (!this.validateBoardVisualRegistryEntry(entry)) return;
    if (this.boardVisualRegistry.has(entry.boardVisualId)) {
      console.warn(`[Runtime Diagnostics] duplicate board visual entry IDs: Board ID "${entry.boardVisualId}" already exists.`);
    }
    this.boardVisualRegistry.set(entry.boardVisualId, JSON.parse(JSON.stringify(entry)));
    if (!this.boardVisualOrder.includes(entry.boardVisualId)) {
      this.boardVisualOrder.push(entry.boardVisualId);
    }
  }

  public getBoardVisualEntry(id: string): BoardVisualRegistryEntry | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed board visual entry: Board ID must be a non-empty string.');
      return undefined;
    }
    const entry = this.boardVisualRegistry.get(id);
    return entry ? JSON.parse(JSON.stringify(entry)) : undefined;
  }

  public getBoardVisualEntries(): BoardVisualRegistryEntry[] {
    return this.boardVisualOrder
      .map(id => this.boardVisualRegistry.get(id))
      .filter((entry): entry is BoardVisualRegistryEntry => !!entry)
      .map(entry => JSON.parse(JSON.stringify(entry)));
  }

  public updateBoardVisualEntry(id: string, updates: Partial<BoardVisualRegistryEntry>): void {
    const existing = this.boardVisualRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing board visual entry: Board "${id}" not found.`);
      return;
    }
    const merged: BoardVisualRegistryEntry = {
      ...existing,
      ...updates,
      boardVisualId: existing.boardVisualId,
      visualModel: updates.visualModel ? { ...existing.visualModel, ...updates.visualModel, connectorMetadata: updates.visualModel.connectorMetadata ? JSON.parse(JSON.stringify(updates.visualModel.connectorMetadata)) : JSON.parse(JSON.stringify(existing.visualModel.connectorMetadata)) } : { ...existing.visualModel, connectorMetadata: JSON.parse(JSON.stringify(existing.visualModel.connectorMetadata)) },
      layout: updates.layout ? { ...existing.layout, ...updates.layout, componentRegions: updates.layout.componentRegions ? JSON.parse(JSON.stringify(updates.layout.componentRegions)) : JSON.parse(JSON.stringify(existing.layout.componentRegions)), powerRegions: updates.layout.powerRegions ? JSON.parse(JSON.stringify(updates.layout.powerRegions)) : JSON.parse(JSON.stringify(existing.layout.powerRegions)), signalRegions: updates.layout.signalRegions ? JSON.parse(JSON.stringify(updates.layout.signalRegions)) : JSON.parse(JSON.stringify(existing.layout.signalRegions)), reservedRegions: updates.layout.reservedRegions ? JSON.parse(JSON.stringify(updates.layout.reservedRegions)) : JSON.parse(JSON.stringify(existing.layout.reservedRegions)) } : { ...existing.layout, componentRegions: JSON.parse(JSON.stringify(existing.layout.componentRegions)), powerRegions: JSON.parse(JSON.stringify(existing.layout.powerRegions)), signalRegions: JSON.parse(JSON.stringify(existing.layout.signalRegions)), reservedRegions: JSON.parse(JSON.stringify(existing.layout.reservedRegions)) },
      interaction: updates.interaction ? { ...existing.interaction, ...updates.interaction } : { ...existing.interaction },
    };
    this.registerBoardVisualEntry(merged);
  }

  public removeBoardVisualEntry(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed board visual entry: Board ID must be a non-empty string.');
      return;
    }
    this.boardVisualRegistry.delete(id);
    this.boardVisualOrder = this.boardVisualOrder.filter(existing => existing !== id);
  }

  public clearBoardVisualRegistry(): void {
    this.boardVisualRegistry.clear();
    this.boardVisualOrder = [];
  }

  public getBoardVisualKeys(): string[] {
    return [...this.boardVisualOrder];
  }

  public hasBoardVisual(id: string): boolean {
    return this.boardVisualRegistry.has(id);
  }

  // ─── Phase 10E: Signal Visual Registry ────────────

  private validateSignalVisualModel(model: SignalVisualModel): boolean {
    if (!model || typeof model.signalVisualId !== 'string' || model.signalVisualId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed signal visual model: Model is missing a valid signalVisualId.');
      return false;
    }
    if (!BaseRuntime.VALID_SIGNAL_VISUAL_TYPES.includes(model.signalType)) {
      console.warn(`[Runtime Diagnostics] invalid signal visual types: Model "${model.signalVisualId}" has invalid signalType "${model.signalType}".`);
      return false;
    }
    if (typeof model.displayName !== 'string' || model.displayName.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed signal visual model: Model "${model.signalVisualId}" has invalid displayName.`);
      return false;
    }
    if (!BaseRuntime.VALID_SIGNAL_VISUAL_CATEGORIES.includes(model.category)) {
      console.warn(`[Runtime Diagnostics] invalid signal visual categories: Model "${model.signalVisualId}" has invalid category "${model.category}".`);
      return false;
    }
    if (typeof model.defaultStyle !== 'string' || model.defaultStyle.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed signal visual model: Model "${model.signalVisualId}" has invalid defaultStyle.`);
      return false;
    }
    if (typeof model.defaultThickness !== 'number' || !Number.isFinite(model.defaultThickness) || model.defaultThickness <= 0) {
      console.warn(`[Runtime Diagnostics] invalid signal thickness: Model "${model.signalVisualId}" has invalid defaultThickness "${model.defaultThickness}".`);
      return false;
    }
    if (typeof model.defaultColorHint !== 'string' || model.defaultColorHint.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed signal visual model: Model "${model.signalVisualId}" has invalid defaultColorHint.`);
      return false;
    }
    if (!this.validatePlainObject(model.futureThemeHints)) {
      console.warn(`[Runtime Diagnostics] malformed signal visual model: Model "${model.signalVisualId}" has invalid futureThemeHints.`);
      return false;
    }
    if (!this.validatePlainObject(model.futureAnimationHints)) {
      console.warn(`[Runtime Diagnostics] malformed signal visual model: Model "${model.signalVisualId}" has invalid futureAnimationHints.`);
      return false;
    }
    return true;
  }

  private validateDigitalSignalMetadata(data: DigitalSignalMetadata, signalVisualId: string): boolean {
    if (!data || typeof data !== 'object') {
      console.warn(`[Runtime Diagnostics] malformed digital signal metadata: Signal "${signalVisualId}" has invalid digital metadata.`);
      return false;
    }
    if (!BaseRuntime.VALID_DIGITAL_SIGNAL_LEVELS.includes(data.level)) {
      console.warn(`[Runtime Diagnostics] invalid digital signal levels: Signal "${signalVisualId}" has invalid level "${data.level}".`);
      return false;
    }
    if (!BaseRuntime.VALID_DIGITAL_SIGNAL_DIRECTIONS.includes(data.direction)) {
      console.warn(`[Runtime Diagnostics] invalid digital signal directions: Signal "${signalVisualId}" has invalid direction "${data.direction}".`);
      return false;
    }
    if (!this.validatePlainObject(data.futurePulseHints)) {
      console.warn(`[Runtime Diagnostics] malformed digital signal metadata: Signal "${signalVisualId}" has invalid futurePulseHints.`);
      return false;
    }
    return true;
  }

  private validateAnalogSignalMetadata(data: AnalogSignalMetadata, signalVisualId: string): boolean {
    if (!data || typeof data !== 'object') {
      console.warn(`[Runtime Diagnostics] malformed analog signal metadata: Signal "${signalVisualId}" has invalid analog metadata.`);
      return false;
    }
    if (typeof data.currentValue !== 'number' || !Number.isFinite(data.currentValue) ||
        typeof data.minimumValue !== 'number' || !Number.isFinite(data.minimumValue) ||
        typeof data.maximumValue !== 'number' || !Number.isFinite(data.maximumValue)) {
      console.warn(`[Runtime Diagnostics] invalid analog signal ranges: Signal "${signalVisualId}" has invalid numeric values.`);
      return false;
    }
    if (data.maximumValue <= data.minimumValue) {
      console.warn(`[Runtime Diagnostics] invalid analog signal ranges: Signal "${signalVisualId}" has maximum <= minimum.`);
      return false;
    }
    if (data.currentValue < data.minimumValue || data.currentValue > data.maximumValue) {
      console.warn(`[Runtime Diagnostics] invalid analog signal ranges: Signal "${signalVisualId}" has currentValue out of range.`);
      return false;
    }
    if (typeof data.normalizedValue !== 'number' || !Number.isFinite(data.normalizedValue) || data.normalizedValue < 0 || data.normalizedValue > 1) {
      console.warn(`[Runtime Diagnostics] invalid analog signal metadata: Signal "${signalVisualId}" has invalid normalizedValue.`);
      return false;
    }
    if (!this.validatePlainObject(data.futureGraphHints)) {
      console.warn(`[Runtime Diagnostics] malformed analog signal metadata: Signal "${signalVisualId}" has invalid futureGraphHints.`);
      return false;
    }
    return true;
  }

  private validatePWMSignalMetadata(data: PWMSignalMetadata, signalVisualId: string): boolean {
    if (!data || typeof data !== 'object') {
      console.warn(`[Runtime Diagnostics] malformed PWM signal metadata: Signal "${signalVisualId}" has invalid PWM metadata.`);
      return false;
    }
    if (typeof data.frequency !== 'number' || !Number.isFinite(data.frequency) || data.frequency <= 0) {
      console.warn(`[Runtime Diagnostics] invalid PWM signal metadata: Signal "${signalVisualId}" has invalid frequency.`);
      return false;
    }
    if (typeof data.dutyCycle !== 'number' || !Number.isFinite(data.dutyCycle) || data.dutyCycle < 0 || data.dutyCycle > 100) {
      console.warn(`[Runtime Diagnostics] invalid PWM signal metadata: Signal "${signalVisualId}" has invalid dutyCycle.`);
      return false;
    }
    if (typeof data.channel !== 'string' || data.channel.length === 0) {
      console.warn(`[Runtime Diagnostics] invalid PWM signal metadata: Signal "${signalVisualId}" has invalid channel.`);
      return false;
    }
    if (!this.validatePlainObject(data.futureWaveformHints)) {
      console.warn(`[Runtime Diagnostics] malformed PWM signal metadata: Signal "${signalVisualId}" has invalid futureWaveformHints.`);
      return false;
    }
    return true;
  }

  private validateProtocolSignalMetadata(data: ProtocolSignalMetadata, signalVisualId: string): boolean {
    if (!data || typeof data !== 'object') {
      console.warn(`[Runtime Diagnostics] malformed protocol signal metadata: Signal "${signalVisualId}" has invalid protocol metadata.`);
      return false;
    }
    if (!BaseRuntime.VALID_PROTOCOL_SIGNAL_TYPES.includes(data.protocolType)) {
      console.warn(`[Runtime Diagnostics] invalid protocol signal types: Signal "${signalVisualId}" has invalid protocolType "${data.protocolType}".`);
      return false;
    }
    if (!this.validatePlainObject(data.futureTrafficHints)) {
      console.warn(`[Runtime Diagnostics] malformed protocol signal metadata: Signal "${signalVisualId}" has invalid futureTrafficHints.`);
      return false;
    }
    if (!this.validatePlainObject(data.futurePacketHints)) {
      console.warn(`[Runtime Diagnostics] malformed protocol signal metadata: Signal "${signalVisualId}" has invalid futurePacketHints.`);
      return false;
    }
    return true;
  }

  private validateSignalVariantMetadata(variant: SignalVariantMetadata, signalVisualId: string): boolean {
    if (!variant || typeof variant.kind !== 'string') {
      console.warn(`[Runtime Diagnostics] malformed signal variant metadata: Signal "${signalVisualId}" has invalid variant kind.`);
      return false;
    }
    switch (variant.kind) {
      case 'digital': return this.validateDigitalSignalMetadata(variant.data, signalVisualId);
      case 'analog': return this.validateAnalogSignalMetadata(variant.data, signalVisualId);
      case 'pwm': return this.validatePWMSignalMetadata(variant.data, signalVisualId);
      case 'protocol': return this.validateProtocolSignalMetadata(variant.data, signalVisualId);
      default:
        console.warn(`[Runtime Diagnostics] invalid signal variant kinds: Signal "${signalVisualId}" has unknown variant kind.`);
        return false;
    }
  }

  private validateSignalInteractionZones(zones: SignalInteractionZone[], label: string, signalVisualId: string): boolean {
    if (!Array.isArray(zones)) {
      console.warn(`[Runtime Diagnostics] invalid signal interaction zones: Signal "${signalVisualId}" has non-array ${label}.`);
      return false;
    }
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i];
      if (!z || typeof z.zoneId !== 'string' || z.zoneId.length === 0 || !BaseRuntime.VALID_SIGNAL_INTERACTION_ZONE_KINDS.includes(z.kind as any) || typeof z.x !== 'number' || typeof z.y !== 'number' || typeof z.width !== 'number' || typeof z.height !== 'number') {
        console.warn(`[Runtime Diagnostics] invalid signal interaction zones: Signal "${signalVisualId}" has invalid ${label} entry at index ${i}.`);
        return false;
      }
    }
    return true;
  }

  private validateSignalInteractionMetadata(interaction: SignalInteractionMetadata, signalVisualId: string): boolean {
    if (!interaction || typeof interaction !== 'object') {
      console.warn(`[Runtime Diagnostics] malformed signal interaction: Signal "${signalVisualId}" has invalid interaction metadata.`);
      return false;
    }
    if (!this.validateSignalInteractionZones(interaction.hoverZones, 'hoverZones', signalVisualId)) return false;
    if (!this.validateSignalInteractionZones(interaction.selectionZones, 'selectionZones', signalVisualId)) return false;
    if (!this.validateSignalInteractionZones(interaction.focusZones, 'focusZones', signalVisualId)) return false;
    if (!this.validateSignalInteractionZones(interaction.inspectionZones, 'inspectionZones', signalVisualId)) return false;
    if (!this.validateSignalInteractionZones(interaction.futureDebuggingZones, 'futureDebuggingZones', signalVisualId)) return false;
    return true;
  }

  private validateSignalVisualRegistryEntry(entry: SignalVisualRegistryEntry): boolean {
    if (!entry || typeof entry.signalVisualId !== 'string' || entry.signalVisualId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed signal visual registry entry: Entry is missing a valid signalVisualId.');
      return false;
    }
    if (!this.validateSignalVisualModel(entry.visualModel)) return false;
    if (!this.validateSignalVariantMetadata(entry.variant, entry.signalVisualId)) return false;
    if (!this.validateSignalInteractionMetadata(entry.interaction, entry.signalVisualId)) return false;
    return true;
  }

  public registerSignalVisualEntry(entry: SignalVisualRegistryEntry): void {
    if (!this.validateSignalVisualRegistryEntry(entry)) return;
    if (this.signalVisualRegistry.has(entry.signalVisualId)) {
      console.warn(`[Runtime Diagnostics] duplicate signal visual entry IDs: Signal ID "${entry.signalVisualId}" already exists.`);
    }
    this.signalVisualRegistry.set(entry.signalVisualId, JSON.parse(JSON.stringify(entry)));
    if (!this.signalVisualOrder.includes(entry.signalVisualId)) {
      this.signalVisualOrder.push(entry.signalVisualId);
    }
  }

  public getSignalVisualEntry(id: string): SignalVisualRegistryEntry | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed signal visual entry: Signal ID must be a non-empty string.');
      return undefined;
    }
    const entry = this.signalVisualRegistry.get(id);
    return entry ? JSON.parse(JSON.stringify(entry)) : undefined;
  }

  public getSignalVisualEntries(): SignalVisualRegistryEntry[] {
    return this.signalVisualOrder
      .map(id => this.signalVisualRegistry.get(id))
      .filter((entry): entry is SignalVisualRegistryEntry => !!entry)
      .map(entry => JSON.parse(JSON.stringify(entry)));
  }

  public updateSignalVisualEntry(id: string, updates: Partial<SignalVisualRegistryEntry>): void {
    const existing = this.signalVisualRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing signal visual entry: Signal "${id}" not found.`);
      return;
    }
    const merged: SignalVisualRegistryEntry = {
      ...existing,
      ...updates,
      signalVisualId: existing.signalVisualId,
      visualModel: updates.visualModel ? { ...existing.visualModel, ...updates.visualModel } : { ...existing.visualModel },
      variant: updates.variant ? JSON.parse(JSON.stringify(updates.variant)) : JSON.parse(JSON.stringify(existing.variant)),
      interaction: updates.interaction ? { ...existing.interaction, ...updates.interaction } : { ...existing.interaction },
    };
    this.registerSignalVisualEntry(merged);
  }

  public removeSignalVisualEntry(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed signal visual entry: Signal ID must be a non-empty string.');
      return;
    }
    this.signalVisualRegistry.delete(id);
    this.signalVisualOrder = this.signalVisualOrder.filter(existing => existing !== id);
  }

  public clearSignalVisualRegistry(): void {
    this.signalVisualRegistry.clear();
    this.signalVisualOrder = [];
  }

  public getSignalVisualKeys(): string[] {
    return [...this.signalVisualOrder];
  }

  public hasSignalVisual(id: string): boolean {
    return this.signalVisualRegistry.has(id);
  }

  // ─── Phase 10F: Animation Metadata Registry ──────────────

  private validateAnimationVisualModel(model: AnimationVisualModel): boolean {
    if (!model || typeof model !== 'object') {
      console.warn('[Runtime Diagnostics] malformed animation visual model: Model is null or not an object.');
      return false;
    }
    if (typeof model.animationId !== 'string' || model.animationId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed animation visual model: animationId must be a non-empty string.');
      return false;
    }
    if (!BaseRuntime.VALID_ANIMATION_TYPES.includes(model.animationType)) {
      console.warn(`[Runtime Diagnostics] invalid animation types: "${model.animationType}" is not a recognized animation type.`);
      return false;
    }
    if (typeof model.displayName !== 'string' || model.displayName.length === 0) {
      console.warn('[Runtime Diagnostics] malformed animation visual model: displayName must be a non-empty string.');
      return false;
    }
    if (typeof model.category !== 'string' || model.category.length === 0) {
      console.warn('[Runtime Diagnostics] malformed animation visual model: category must be a non-empty string.');
      return false;
    }
    if (typeof model.duration !== 'number' || !Number.isFinite(model.duration) || model.duration < 0) {
      console.warn(`[Runtime Diagnostics] invalid animation durations: duration "${model.duration}" is not a valid non-negative finite number.`);
      return false;
    }
    if (!BaseRuntime.VALID_ANIMATION_REPEAT_MODES.includes(model.repeatMode)) {
      console.warn(`[Runtime Diagnostics] invalid animation repeat modes: "${model.repeatMode}" is not a recognized repeat mode.`);
      return false;
    }
    if (!BaseRuntime.VALID_ANIMATION_PLAYBACK_MODES.includes(model.playbackMode)) {
      console.warn(`[Runtime Diagnostics] invalid animation playback modes: "${model.playbackMode}" is not a recognized playback mode.`);
      return false;
    }
    if (!model.futureRendererHints || typeof model.futureRendererHints !== 'object') {
      console.warn('[Runtime Diagnostics] malformed animation visual model: futureRendererHints must be a non-null object.');
      return false;
    }
    return true;
  }

  private validateComponentAnimationMetadata(meta: ComponentAnimationMetadata, animationId: string): boolean {
    if (!meta || typeof meta !== 'object') {
      console.warn(`[Runtime Diagnostics] malformed component animation metadata: Animation "${animationId}" has null or non-object componentAnimation.`);
      return false;
    }
    if (!meta.ledBlinkHints || typeof meta.ledBlinkHints !== 'object') { console.warn(`[Runtime Diagnostics] malformed component animation ledBlinkHints: Animation "${animationId}".`); return false; }
    if (!meta.servoMotionHints || typeof meta.servoMotionHints !== 'object') { console.warn(`[Runtime Diagnostics] malformed component animation servoMotionHints: Animation "${animationId}".`); return false; }
    if (!meta.buttonPressHints || typeof meta.buttonPressHints !== 'object') { console.warn(`[Runtime Diagnostics] malformed component animation buttonPressHints: Animation "${animationId}".`); return false; }
    if (!meta.lcdRefreshHints || typeof meta.lcdRefreshHints !== 'object') { console.warn(`[Runtime Diagnostics] malformed component animation lcdRefreshHints: Animation "${animationId}".`); return false; }
    if (!meta.oledRefreshHints || typeof meta.oledRefreshHints !== 'object') { console.warn(`[Runtime Diagnostics] malformed component animation oledRefreshHints: Animation "${animationId}".`); return false; }
    if (!meta.futureDeviceActivityHints || typeof meta.futureDeviceActivityHints !== 'object') { console.warn(`[Runtime Diagnostics] malformed component animation futureDeviceActivityHints: Animation "${animationId}".`); return false; }
    return true;
  }

  private validateWireAnimationMetadata(meta: WireAnimationMetadata, animationId: string): boolean {
    if (!meta || typeof meta !== 'object') { console.warn(`[Runtime Diagnostics] malformed wire animation metadata: Animation "${animationId}".`); return false; }
    if (!meta.signalFlowHints || typeof meta.signalFlowHints !== 'object') { console.warn(`[Runtime Diagnostics] malformed wire animation signalFlowHints: Animation "${animationId}".`); return false; }
    if (!meta.pulseHints || typeof meta.pulseHints !== 'object') { console.warn(`[Runtime Diagnostics] malformed wire animation pulseHints: Animation "${animationId}".`); return false; }
    if (!meta.activityHints || typeof meta.activityHints !== 'object') { console.warn(`[Runtime Diagnostics] malformed wire animation activityHints: Animation "${animationId}".`); return false; }
    if (!meta.futureTrafficHints || typeof meta.futureTrafficHints !== 'object') { console.warn(`[Runtime Diagnostics] malformed wire animation futureTrafficHints: Animation "${animationId}".`); return false; }
    return true;
  }

  private validateBoardAnimationMetadata(meta: BoardAnimationMetadata, animationId: string): boolean {
    if (!meta || typeof meta !== 'object') { console.warn(`[Runtime Diagnostics] malformed board animation metadata: Animation "${animationId}".`); return false; }
    if (!meta.powerActivityHints || typeof meta.powerActivityHints !== 'object') { console.warn(`[Runtime Diagnostics] malformed board animation powerActivityHints: Animation "${animationId}".`); return false; }
    if (!meta.statusIndicators || typeof meta.statusIndicators !== 'object') { console.warn(`[Runtime Diagnostics] malformed board animation statusIndicators: Animation "${animationId}".`); return false; }
    if (!meta.futureBoardActivityHints || typeof meta.futureBoardActivityHints !== 'object') { console.warn(`[Runtime Diagnostics] malformed board animation futureBoardActivityHints: Animation "${animationId}".`); return false; }
    return true;
  }

  private validateSignalAnimationMetadata(meta: SignalAnimationMetadata, animationId: string): boolean {
    if (!meta || typeof meta !== 'object') { console.warn(`[Runtime Diagnostics] malformed signal animation metadata: Animation "${animationId}".`); return false; }
    if (!meta.highTransitionHints || typeof meta.highTransitionHints !== 'object') { console.warn(`[Runtime Diagnostics] malformed signal animation highTransitionHints: Animation "${animationId}".`); return false; }
    if (!meta.lowTransitionHints || typeof meta.lowTransitionHints !== 'object') { console.warn(`[Runtime Diagnostics] malformed signal animation lowTransitionHints: Animation "${animationId}".`); return false; }
    if (!meta.pwmTransitionHints || typeof meta.pwmTransitionHints !== 'object') { console.warn(`[Runtime Diagnostics] malformed signal animation pwmTransitionHints: Animation "${animationId}".`); return false; }
    if (!meta.analogTransitionHints || typeof meta.analogTransitionHints !== 'object') { console.warn(`[Runtime Diagnostics] malformed signal animation analogTransitionHints: Animation "${animationId}".`); return false; }
    if (!meta.protocolTrafficHints || typeof meta.protocolTrafficHints !== 'object') { console.warn(`[Runtime Diagnostics] malformed signal animation protocolTrafficHints: Animation "${animationId}".`); return false; }
    return true;
  }

  private validateInteractionAnimationMetadata(meta: InteractionAnimationMetadata, animationId: string): boolean {
    if (!meta || typeof meta !== 'object') { console.warn(`[Runtime Diagnostics] malformed interaction animation metadata: Animation "${animationId}".`); return false; }
    if (!meta.hoverAnimations || typeof meta.hoverAnimations !== 'object') { console.warn(`[Runtime Diagnostics] malformed interaction animation hoverAnimations: Animation "${animationId}".`); return false; }
    if (!meta.selectionAnimations || typeof meta.selectionAnimations !== 'object') { console.warn(`[Runtime Diagnostics] malformed interaction animation selectionAnimations: Animation "${animationId}".`); return false; }
    if (!meta.focusAnimations || typeof meta.focusAnimations !== 'object') { console.warn(`[Runtime Diagnostics] malformed interaction animation focusAnimations: Animation "${animationId}".`); return false; }
    if (!meta.futureEditingAnimations || typeof meta.futureEditingAnimations !== 'object') { console.warn(`[Runtime Diagnostics] malformed interaction animation futureEditingAnimations: Animation "${animationId}".`); return false; }
    return true;
  }

  private validateAnimationRegistryEntry(entry: AnimationRegistryEntry): boolean {
    if (!entry || typeof entry.animationId !== 'string' || entry.animationId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed animation registry entry: Entry is missing a valid animationId.');
      return false;
    }
    if (!this.validateAnimationVisualModel(entry.visualModel)) return false;
    if (!this.validateComponentAnimationMetadata(entry.componentAnimation, entry.animationId)) return false;
    if (!this.validateWireAnimationMetadata(entry.wireAnimation, entry.animationId)) return false;
    if (!this.validateBoardAnimationMetadata(entry.boardAnimation, entry.animationId)) return false;
    if (!this.validateSignalAnimationMetadata(entry.signalAnimation, entry.animationId)) return false;
    if (!this.validateInteractionAnimationMetadata(entry.interactionAnimation, entry.animationId)) return false;
    return true;
  }

  public registerAnimationEntry(entry: AnimationRegistryEntry): void {
    if (!this.validateAnimationRegistryEntry(entry)) return;
    if (this.animationRegistry.has(entry.animationId)) {
      console.warn(`[Runtime Diagnostics] duplicate animation entry IDs: Animation ID "${entry.animationId}" already exists.`);
    }
    this.animationRegistry.set(entry.animationId, JSON.parse(JSON.stringify(entry)));
    if (!this.animationOrder.includes(entry.animationId)) {
      this.animationOrder.push(entry.animationId);
    }
  }

  public getAnimationEntry(id: string): AnimationRegistryEntry | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed animation entry: Animation ID must be a non-empty string.');
      return undefined;
    }
    const entry = this.animationRegistry.get(id);
    return entry ? JSON.parse(JSON.stringify(entry)) : undefined;
  }

  public getAnimationEntries(): AnimationRegistryEntry[] {
    return this.animationOrder
      .map(id => this.animationRegistry.get(id))
      .filter((entry): entry is AnimationRegistryEntry => !!entry)
      .map(entry => JSON.parse(JSON.stringify(entry)));
  }

  public updateAnimationEntry(id: string, updates: Partial<AnimationRegistryEntry>): void {
    const existing = this.animationRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing animation entry: Animation "${id}" not found.`);
      return;
    }
    const merged: AnimationRegistryEntry = {
      ...existing,
      ...updates,
      animationId: existing.animationId,
      visualModel: updates.visualModel ? { ...existing.visualModel, ...updates.visualModel } : { ...existing.visualModel },
      componentAnimation: updates.componentAnimation ? { ...existing.componentAnimation, ...updates.componentAnimation } : { ...existing.componentAnimation },
      wireAnimation: updates.wireAnimation ? { ...existing.wireAnimation, ...updates.wireAnimation } : { ...existing.wireAnimation },
      boardAnimation: updates.boardAnimation ? { ...existing.boardAnimation, ...updates.boardAnimation } : { ...existing.boardAnimation },
      signalAnimation: updates.signalAnimation ? { ...existing.signalAnimation, ...updates.signalAnimation } : { ...existing.signalAnimation },
      interactionAnimation: updates.interactionAnimation ? { ...existing.interactionAnimation, ...updates.interactionAnimation } : { ...existing.interactionAnimation },
    };
    this.registerAnimationEntry(merged);
  }

  public removeAnimationEntry(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed animation entry: Animation ID must be a non-empty string.');
      return;
    }
    this.animationRegistry.delete(id);
    this.animationOrder = this.animationOrder.filter(existing => existing !== id);
  }

  public clearAnimationRegistry(): void {
    this.animationRegistry.clear();
    this.animationOrder = [];
  }

  public getAnimationKeys(): string[] {
    return [...this.animationOrder];
  }

  public hasAnimation(id: string): boolean {
    return this.animationRegistry.has(id);
  }

  // ─── Phase 11B: Visual Interaction Registry ────────────

  private validateSelectionMetadata(selection: SelectionMetadata, interactionId: string): boolean {
    if (!selection || typeof selection !== 'object') {
      console.warn(`[Runtime Diagnostics] malformed selection metadata: Interaction "${interactionId}" has invalid selectionState.`);
      return false;
    }
    if (!selection.selectionType) {
      console.warn(`[Runtime Diagnostics] malformed selection metadata: Interaction "${interactionId}" is missing selectionType.`);
      return false;
    }
    if (!Array.isArray(selection.selectedIds)) {
      console.warn(`[Runtime Diagnostics] malformed selection metadata: Interaction "${interactionId}" selectedIds is not an array.`);
      return false;
    }
    return true;
  }

  private validateHoverMetadata(hover: HoverMetadata, interactionId: string): boolean {
    if (!hover || typeof hover !== 'object') {
      console.warn(`[Runtime Diagnostics] malformed hover metadata: Interaction "${interactionId}" has invalid hoverState.`);
      return false;
    }
    if (!Array.isArray(hover.hoverTargetIds)) {
      console.warn(`[Runtime Diagnostics] malformed hover metadata: Interaction "${interactionId}" hoverTargetIds is not an array.`);
      return false;
    }
    if (!hover.priority) {
      console.warn(`[Runtime Diagnostics] malformed hover metadata: Interaction "${interactionId}" is missing priority.`);
      return false;
    }
    if (!hover.source) {
      console.warn(`[Runtime Diagnostics] malformed hover metadata: Interaction "${interactionId}" is missing source.`);
      return false;
    }
    return true;
  }

  private validateFocusMetadata(focus: FocusMetadata, interactionId: string): boolean {
    if (!focus || typeof focus !== 'object') {
      console.warn(`[Runtime Diagnostics] malformed focus metadata: Interaction "${interactionId}" has invalid focusState.`);
      return false;
    }
    if (!Array.isArray(focus.focusTargetIds)) {
      console.warn(`[Runtime Diagnostics] malformed focus metadata: Interaction "${interactionId}" focusTargetIds is not an array.`);
      return false;
    }
    if (!Array.isArray(focus.focusChain)) {
      console.warn(`[Runtime Diagnostics] malformed focus metadata: Interaction "${interactionId}" focusChain is not an array.`);
      return false;
    }
    if (!focus.ownership) {
      console.warn(`[Runtime Diagnostics] malformed focus metadata: Interaction "${interactionId}" is missing ownership.`);
      return false;
    }
    return true;
  }

  private validateInspectionMetadataArray(inspections: InspectionMetadata[], interactionId: string): boolean {
    if (!Array.isArray(inspections)) {
      console.warn(`[Runtime Diagnostics] malformed inspection metadata: Interaction "${interactionId}" inspectionState is not an array.`);
      return false;
    }
    for (let i = 0; i < inspections.length; i++) {
      const insp = inspections[i];
      if (!insp || typeof insp !== 'object') {
        console.warn(`[Runtime Diagnostics] malformed inspection metadata: Interaction "${interactionId}" inspectionState[${i}] is invalid.`);
        return false;
      }
      if (!insp.inspectionTargetType) {
        console.warn(`[Runtime Diagnostics] malformed inspection metadata: Interaction "${interactionId}" inspectionState[${i}] is missing inspectionTargetType.`);
        return false;
      }
      if (!insp.targetId) {
        console.warn(`[Runtime Diagnostics] malformed inspection metadata: Interaction "${interactionId}" inspectionState[${i}] is missing targetId.`);
        return false;
      }
    }
    return true;
  }

  private validateInteractionMetadata(entry: InteractionMetadata): boolean {
    if (!entry || typeof entry !== 'object') {
      console.warn('[Runtime Diagnostics] malformed interaction entry: Entry is not a valid object.');
      return false;
    }
    if (!entry.interactionId || typeof entry.interactionId !== 'string') {
      console.warn('[Runtime Diagnostics] malformed interaction entry: Missing or invalid interactionId.');
      return false;
    }
    if (!entry.interactionType) {
      console.warn('[Runtime Diagnostics] malformed interaction entry: Missing interactionType.');
      return false;
    }
    if (!entry.targetId || typeof entry.targetId !== 'string') {
      console.warn('[Runtime Diagnostics] malformed interaction entry: Missing or invalid targetId.');
      return false;
    }
    if (!this.validateSelectionMetadata(entry.selectionState, entry.interactionId)) return false;
    if (!this.validateHoverMetadata(entry.hoverState, entry.interactionId)) return false;
    if (!this.validateFocusMetadata(entry.focusState, entry.interactionId)) return false;
    if (!this.validateInspectionMetadataArray(entry.inspectionState, entry.interactionId)) return false;
    return true;
  }

  public registerInteractionEntry(entry: InteractionMetadata): void {
    if (!this.validateInteractionMetadata(entry)) return;
    if (this.interactionRegistry.has(entry.interactionId)) {
      console.warn(`[Runtime Diagnostics] duplicate interaction entry IDs: Interaction ID "${entry.interactionId}" already exists.`);
    }
    this.interactionRegistry.set(entry.interactionId, JSON.parse(JSON.stringify(entry)));
    if (!this.interactionOrder.includes(entry.interactionId)) {
      this.interactionOrder.push(entry.interactionId);
    }
  }

  public getInteractionEntry(id: string): InteractionMetadata | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed interaction entry: Interaction ID must be a non-empty string.');
      return undefined;
    }
    const entry = this.interactionRegistry.get(id);
    return entry ? JSON.parse(JSON.stringify(entry)) : undefined;
  }

  public getInteractionEntries(): InteractionMetadata[] {
    return this.interactionOrder
      .map(id => this.interactionRegistry.get(id))
      .filter((entry): entry is InteractionMetadata => !!entry)
      .map(entry => JSON.parse(JSON.stringify(entry)));
  }

  public updateInteractionEntry(id: string, updates: Partial<InteractionMetadata>): void {
    const existing = this.interactionRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing interaction entry: Interaction "${id}" not found.`);
      return;
    }
    const merged: InteractionMetadata = {
      ...existing,
      ...updates,
      interactionId: existing.interactionId,
      selectionState: updates.selectionState ? { ...existing.selectionState, ...updates.selectionState } : { ...existing.selectionState },
      hoverState: updates.hoverState ? { ...existing.hoverState, ...updates.hoverState } : { ...existing.hoverState },
      focusState: updates.focusState ? { ...existing.focusState, ...updates.focusState } : { ...existing.focusState },
      inspectionState: updates.inspectionState ? updates.inspectionState.map(i => ({ ...i })) : existing.inspectionState.map(i => ({ ...i })),
    };
    this.registerInteractionEntry(merged);
  }

  public removeInteractionEntry(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed interaction entry: Interaction ID must be a non-empty string.');
      return;
    }
    if (!this.interactionRegistry.has(id)) {
      console.warn(`[Runtime Diagnostics] missing interaction entry: Interaction "${id}" not found for removal.`);
      return;
    }
    this.interactionRegistry.delete(id);
    this.interactionOrder = this.interactionOrder.filter(existing => existing !== id);
  }

  public clearInteractionRegistry(): void {
    this.interactionRegistry.clear();
    this.interactionOrder = [];
  }

  public getInteractionKeys(): string[] {
    return [...this.interactionOrder];
  }

  public hasInteraction(id: string): boolean {
    return this.interactionRegistry.has(id);
  }

  // ─── Phase 12A: Canvas Rendering Foundation ──────────────────

  private static readonly VALID_NODE_TYPES: NodeType[] = ['COMPONENT', 'WIRE', 'BOARD', 'SIGNAL', 'ANIMATION', 'GROUP', 'CUSTOM'];
  private static readonly VALID_VISIBILITY_STATES: VisibilityState[] = ['VISIBLE', 'HIDDEN', 'PARENT_HIDDEN'];
  private static readonly VALID_PIPELINE_TYPES: PipelineType[] = ['FORWARD', 'DEFERRED', 'CUSTOM'];

  private validateRenderNodeModel(model: RenderNodeModel): boolean {
    if (!model || typeof model.renderNodeId !== 'string' || model.renderNodeId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed render node: Missing a valid renderNodeId.');
      return false;
    }
    if (!BaseRuntime.VALID_NODE_TYPES.includes(model.nodeType)) {
      console.warn(`[Runtime Diagnostics] invalid node types: Render node "${model.renderNodeId}" has invalid nodeType "${model.nodeType}".`);
      return false;
    }
    if (typeof model.displayName !== 'string' || model.displayName.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed render node: Render node "${model.renderNodeId}" has invalid displayName.`);
      return false;
    }
    if (!BaseRuntime.VALID_VISIBILITY_STATES.includes(model.visibilityState)) {
      console.warn(`[Runtime Diagnostics] invalid visibility states: Render node "${model.renderNodeId}" has invalid visibilityState "${model.visibilityState}".`);
      return false;
    }
    if (!Array.isArray(model.childNodeIds)) {
      console.warn(`[Runtime Diagnostics] malformed render node: Render node "${model.renderNodeId}" has invalid childNodeIds.`);
      return false;
    }
    if (model.parentNodeId === model.renderNodeId) {
      console.warn(`[Runtime Diagnostics] invalid node parenting: Render node "${model.renderNodeId}" references itself as parent.`);
      return false;
    }
    if (typeof model.futureRendererHints !== 'object' || model.futureRendererHints === null || Array.isArray(model.futureRendererHints)) {
      console.warn(`[Runtime Diagnostics] malformed render node: Render node "${model.renderNodeId}" has invalid futureRendererHints.`);
      return false;
    }
    return true;
  }

  public registerRenderNode(model: RenderNodeModel): void {
    if (!this.validateRenderNodeModel(model)) return;
    if (this.renderNodeRegistry.has(model.renderNodeId)) {
      console.warn(`[Runtime Diagnostics] duplicate render node IDs: Node ID "${model.renderNodeId}" already exists.`);
    }
    this.renderNodeRegistry.set(model.renderNodeId, JSON.parse(JSON.stringify(model)));
    if (!this.renderNodeOrder.includes(model.renderNodeId)) {
      this.renderNodeOrder.push(model.renderNodeId);
    }
  }

  public getRenderNode(id: string): RenderNodeModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed render node: Node ID must be a non-empty string.');
      return undefined;
    }
    const model = this.renderNodeRegistry.get(id);
    return model ? JSON.parse(JSON.stringify(model)) : undefined;
  }

  public getRenderNodes(): RenderNodeModel[] {
    return this.renderNodeOrder
      .map(id => this.renderNodeRegistry.get(id))
      .filter((model): model is RenderNodeModel => !!model)
      .map(model => JSON.parse(JSON.stringify(model)));
  }

  public updateRenderNode(id: string, updates: Partial<RenderNodeModel>): void {
    const existing = this.renderNodeRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing render node: Node "${id}" not found.`);
      return;
    }
    const merged: RenderNodeModel = {
      ...existing,
      ...updates,
      renderNodeId: existing.renderNodeId,
      childNodeIds: updates.childNodeIds ? [...updates.childNodeIds] : [...existing.childNodeIds],
    };
    this.registerRenderNode(merged);
  }

  public removeRenderNode(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed render node: Node ID must be a non-empty string.');
      return;
    }
    this.renderNodeRegistry.delete(id);
    this.renderNodeOrder = this.renderNodeOrder.filter(existing => existing !== id);
  }

  public clearRenderNodes(): void {
    this.renderNodeRegistry.clear();
    this.renderNodeOrder = [];
  }

  public getRenderNodeKeys(): string[] {
    return [...this.renderNodeOrder];
  }

  public hasRenderNode(id: string): boolean {
    return this.renderNodeRegistry.has(id);
  }

  private validateSceneGraphModel(graph: SceneGraphModel): boolean {
    if (!graph || typeof graph.sceneGraphId !== 'string' || graph.sceneGraphId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed scene graph: Missing a valid sceneGraphId.');
      return false;
    }
    if (typeof graph.rootNodeId !== 'string' || graph.rootNodeId.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed scene graph: Scene graph "${graph.sceneGraphId}" has invalid rootNodeId.`);
      return false;
    }
    if (!Array.isArray(graph.nodeHierarchy)) {
      console.warn(`[Runtime Diagnostics] malformed scene graph: Scene graph "${graph.sceneGraphId}" has invalid nodeHierarchy.`);
      return false;
    }
    if (!Array.isArray(graph.layerMembership)) {
      console.warn(`[Runtime Diagnostics] malformed scene graph: Scene graph "${graph.sceneGraphId}" has invalid layerMembership.`);
      return false;
    }
    if (graph.nodeHierarchy.length > 0 && !graph.nodeHierarchy.includes(graph.rootNodeId)) {
      console.warn(`[Runtime Diagnostics] invalid scene graph: Scene graph "${graph.sceneGraphId}" rootNodeId not in nodeHierarchy.`);
      return false;
    }
    if (typeof graph.futureOptimizationHints !== 'object' || graph.futureOptimizationHints === null || Array.isArray(graph.futureOptimizationHints)) {
      console.warn(`[Runtime Diagnostics] malformed scene graph: Scene graph "${graph.sceneGraphId}" has invalid futureOptimizationHints.`);
      return false;
    }
    return true;
  }

  public registerSceneGraph(graph: SceneGraphModel): void {
    if (!this.validateSceneGraphModel(graph)) return;
    if (this.sceneGraphRegistry.has(graph.sceneGraphId)) {
      console.warn(`[Runtime Diagnostics] duplicate scene graph IDs: Graph ID "${graph.sceneGraphId}" already exists.`);
    }
    this.sceneGraphRegistry.set(graph.sceneGraphId, JSON.parse(JSON.stringify(graph)));
    if (!this.sceneGraphOrder.includes(graph.sceneGraphId)) {
      this.sceneGraphOrder.push(graph.sceneGraphId);
    }
  }

  public getSceneGraph(id: string): SceneGraphModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed scene graph: Graph ID must be a non-empty string.');
      return undefined;
    }
    const graph = this.sceneGraphRegistry.get(id);
    return graph ? JSON.parse(JSON.stringify(graph)) : undefined;
  }

  public getSceneGraphs(): SceneGraphModel[] {
    return this.sceneGraphOrder
      .map(id => this.sceneGraphRegistry.get(id))
      .filter((graph): graph is SceneGraphModel => !!graph)
      .map(graph => JSON.parse(JSON.stringify(graph)));
  }

  public updateSceneGraph(id: string, updates: Partial<SceneGraphModel>): void {
    const existing = this.sceneGraphRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing scene graph: Graph "${id}" not found.`);
      return;
    }
    const merged: SceneGraphModel = {
      ...existing,
      ...updates,
      sceneGraphId: existing.sceneGraphId,
      nodeHierarchy: updates.nodeHierarchy ? [...updates.nodeHierarchy] : [...existing.nodeHierarchy],
      layerMembership: updates.layerMembership ? [...updates.layerMembership] : [...existing.layerMembership],
    };
    this.registerSceneGraph(merged);
  }

  public removeSceneGraph(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed scene graph: Graph ID must be a non-empty string.');
      return;
    }
    this.sceneGraphRegistry.delete(id);
    this.sceneGraphOrder = this.sceneGraphOrder.filter(existing => existing !== id);
  }

  public clearSceneGraphs(): void {
    this.sceneGraphRegistry.clear();
    this.sceneGraphOrder = [];
  }

  public getSceneGraphKeys(): string[] {
    return [...this.sceneGraphOrder];
  }

  public hasSceneGraph(id: string): boolean {
    return this.sceneGraphRegistry.has(id);
  }

  private validateViewportModel(viewport: ViewportModel): boolean {
    if (!viewport || typeof viewport.viewportId !== 'string' || viewport.viewportId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed viewport model: Missing a valid viewportId.');
      return false;
    }
    if (typeof viewport.width !== 'number' || !Number.isFinite(viewport.width) || viewport.width <= 0) {
      console.warn(`[Runtime Diagnostics] invalid viewport dimensions: Viewport "${viewport.viewportId}" has invalid width "${viewport.width}".`);
      return false;
    }
    if (typeof viewport.height !== 'number' || !Number.isFinite(viewport.height) || viewport.height <= 0) {
      console.warn(`[Runtime Diagnostics] invalid viewport dimensions: Viewport "${viewport.viewportId}" has invalid height "${viewport.height}".`);
      return false;
    }
    if (typeof viewport.zoom !== 'number' || !Number.isFinite(viewport.zoom) || viewport.zoom <= 0) {
      console.warn(`[Runtime Diagnostics] invalid viewport zoom: Viewport "${viewport.viewportId}" has invalid zoom "${viewport.zoom}".`);
      return false;
    }
    if (typeof viewport.panX !== 'number' || !Number.isFinite(viewport.panX)) {
      console.warn(`[Runtime Diagnostics] invalid viewport pan: Viewport "${viewport.viewportId}" has invalid panX "${viewport.panX}".`);
      return false;
    }
    if (typeof viewport.panY !== 'number' || !Number.isFinite(viewport.panY)) {
      console.warn(`[Runtime Diagnostics] invalid viewport pan: Viewport "${viewport.viewportId}" has invalid panY "${viewport.panY}".`);
      return false;
    }
    if (!viewport.visibleRegion || typeof viewport.visibleRegion.x !== 'number' || typeof viewport.visibleRegion.y !== 'number' || typeof viewport.visibleRegion.width !== 'number' || typeof viewport.visibleRegion.height !== 'number') {
      console.warn(`[Runtime Diagnostics] invalid viewport region: Viewport "${viewport.viewportId}" has invalid visibleRegion.`);
      return false;
    }
    if (typeof viewport.futureNavigationHints !== 'object' || viewport.futureNavigationHints === null || Array.isArray(viewport.futureNavigationHints)) {
      console.warn(`[Runtime Diagnostics] malformed viewport model: Viewport "${viewport.viewportId}" has invalid futureNavigationHints.`);
      return false;
    }
    return true;
  }

  public registerViewportModel(viewport: ViewportModel): void {
    if (!this.validateViewportModel(viewport)) return;
    if (this.viewportModelRegistry.has(viewport.viewportId)) {
      console.warn(`[Runtime Diagnostics] duplicate viewport IDs: Viewport ID "${viewport.viewportId}" already exists.`);
    }
    this.viewportModelRegistry.set(viewport.viewportId, JSON.parse(JSON.stringify(viewport)));
    if (!this.viewportModelOrder.includes(viewport.viewportId)) {
      this.viewportModelOrder.push(viewport.viewportId);
    }
  }

  public getViewportModel(id: string): ViewportModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed viewport model: Viewport ID must be a non-empty string.');
      return undefined;
    }
    const vp = this.viewportModelRegistry.get(id);
    return vp ? JSON.parse(JSON.stringify(vp)) : undefined;
  }

  public getViewportModels(): ViewportModel[] {
    return this.viewportModelOrder
      .map(id => this.viewportModelRegistry.get(id))
      .filter((vp): vp is ViewportModel => !!vp)
      .map(vp => JSON.parse(JSON.stringify(vp)));
  }

  public updateViewportModel(id: string, updates: Partial<ViewportModel>): void {
    const existing = this.viewportModelRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing viewport model: Viewport "${id}" not found.`);
      return;
    }
    const merged: ViewportModel = {
      ...existing,
      ...updates,
      viewportId: existing.viewportId,
      visibleRegion: updates.visibleRegion ? { ...updates.visibleRegion } : { ...existing.visibleRegion },
    };
    this.registerViewportModel(merged);
  }

  public removeViewportModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed viewport model: Viewport ID must be a non-empty string.');
      return;
    }
    this.viewportModelRegistry.delete(id);
    this.viewportModelOrder = this.viewportModelOrder.filter(existing => existing !== id);
  }

  public clearViewportModels(): void {
    this.viewportModelRegistry.clear();
    this.viewportModelOrder = [];
  }

  public getViewportModelKeys(): string[] {
    return [...this.viewportModelOrder];
  }

  public hasViewportModel(id: string): boolean {
    return this.viewportModelRegistry.has(id);
  }

  private validateRenderPipelineModel(pipeline: RenderPipelineModel): boolean {
    if (!pipeline || typeof pipeline.pipelineId !== 'string' || pipeline.pipelineId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed render pipeline: Missing a valid pipelineId.');
      return false;
    }
    if (!BaseRuntime.VALID_PIPELINE_TYPES.includes(pipeline.pipelineType)) {
      console.warn(`[Runtime Diagnostics] invalid pipeline types: Pipeline "${pipeline.pipelineId}" has invalid pipelineType "${pipeline.pipelineType}".`);
      return false;
    }
    if (typeof pipeline.renderOrder !== 'number' || !Number.isInteger(pipeline.renderOrder)) {
      console.warn(`[Runtime Diagnostics] invalid pipeline order: Pipeline "${pipeline.pipelineId}" has invalid renderOrder "${pipeline.renderOrder}".`);
      return false;
    }
    if (!Array.isArray(pipeline.enabledLayers)) {
      console.warn(`[Runtime Diagnostics] malformed render pipeline: Pipeline "${pipeline.pipelineId}" has invalid enabledLayers.`);
      return false;
    }
    if (typeof pipeline.futureOptimizationHints !== 'object' || pipeline.futureOptimizationHints === null || Array.isArray(pipeline.futureOptimizationHints)) {
      console.warn(`[Runtime Diagnostics] malformed render pipeline: Pipeline "${pipeline.pipelineId}" has invalid futureOptimizationHints.`);
      return false;
    }
    return true;
  }

  public registerRenderPipeline(pipeline: RenderPipelineModel): void {
    if (!this.validateRenderPipelineModel(pipeline)) return;
    if (this.pipelineRegistry.has(pipeline.pipelineId)) {
      console.warn(`[Runtime Diagnostics] duplicate pipeline IDs: Pipeline ID "${pipeline.pipelineId}" already exists.`);
    }
    this.pipelineRegistry.set(pipeline.pipelineId, JSON.parse(JSON.stringify(pipeline)));
    if (!this.pipelineOrder.includes(pipeline.pipelineId)) {
      this.pipelineOrder.push(pipeline.pipelineId);
    }
  }

  public getRenderPipeline(id: string): RenderPipelineModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed render pipeline: Pipeline ID must be a non-empty string.');
      return undefined;
    }
    const pipe = this.pipelineRegistry.get(id);
    return pipe ? JSON.parse(JSON.stringify(pipe)) : undefined;
  }

  public getRenderPipelines(): RenderPipelineModel[] {
    return this.pipelineOrder
      .map(id => this.pipelineRegistry.get(id))
      .filter((pipe): pipe is RenderPipelineModel => !!pipe)
      .map(pipe => JSON.parse(JSON.stringify(pipe)));
  }

  public updateRenderPipeline(id: string, updates: Partial<RenderPipelineModel>): void {
    const existing = this.pipelineRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing render pipeline: Pipeline "${id}" not found.`);
      return;
    }
    const merged: RenderPipelineModel = {
      ...existing,
      ...updates,
      pipelineId: existing.pipelineId,
      enabledLayers: updates.enabledLayers ? [...updates.enabledLayers] : [...existing.enabledLayers],
    };
    this.registerRenderPipeline(merged);
  }

  public removeRenderPipeline(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed render pipeline: Pipeline ID must be a non-empty string.');
      return;
    }
    this.pipelineRegistry.delete(id);
    this.pipelineOrder = this.pipelineOrder.filter(existing => existing !== id);
  }

  public clearRenderPipelines(): void {
    this.pipelineRegistry.clear();
    this.pipelineOrder = [];
  }

  public getRenderPipelineKeys(): string[] {
    return [...this.pipelineOrder];
  }

  public hasRenderPipeline(id: string): boolean {
    return this.pipelineRegistry.has(id);
  }

  // ─── Phase 12B: Component Rendering Registry ─────────────────

  private static readonly VALID_LABEL_POSITIONS: ComponentLabelPosition[] = [
    'TOP', 'BOTTOM', 'LEFT', 'RIGHT', 'CENTER',
  ];

  private validateComponentRenderModel(model: ComponentRenderModel): boolean {
    if (!model || typeof model.componentRenderId !== 'string' || model.componentRenderId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed component render: Missing a valid componentRenderId.');
      return false;
    }
    if (typeof model.componentId !== 'string' || model.componentId.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed component render: Component render "${model.componentRenderId}" has invalid componentId.`);
      return false;
    }
    if (!BaseRuntime.VALID_COMPONENT_TYPES.includes(model.componentType)) {
      console.warn(`[Runtime Diagnostics] invalid component types: Component render "${model.componentRenderId}" has invalid componentType "${model.componentType}".`);
      return false;
    }
    if (typeof model.displayName !== 'string' || model.displayName.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed component render: Component render "${model.componentRenderId}" has empty displayName.`);
      return false;
    }
    if (typeof model.renderNodeId !== 'string' || model.renderNodeId.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed component render: Component render "${model.componentRenderId}" has invalid renderNodeId.`);
      return false;
    }
    if (typeof model.layerId !== 'string' || model.layerId.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed component render: Component render "${model.componentRenderId}" has invalid layerId.`);
      return false;
    }
    if (!BaseRuntime.VALID_VISIBILITY_STATES.includes(model.visibilityState)) {
      console.warn(`[Runtime Diagnostics] invalid visibility states: Component render "${model.componentRenderId}" has invalid visibilityState "${model.visibilityState}".`);
      return false;
    }
    if (typeof model.selectionState !== 'boolean') {
      console.warn(`[Runtime Diagnostics] malformed component render: Component render "${model.componentRenderId}" selectionState must be a boolean.`);
      return false;
    }
    if (typeof model.focusState !== 'boolean') {
      console.warn(`[Runtime Diagnostics] malformed component render: Component render "${model.componentRenderId}" focusState must be a boolean.`);
      return false;
    }
    if (typeof model.futureRendererHints !== 'object' || model.futureRendererHints === null || Array.isArray(model.futureRendererHints)) {
      console.warn(`[Runtime Diagnostics] malformed component render: Component render "${model.componentRenderId}" has invalid futureRendererHints.`);
      return false;
    }
    return true;
  }

  public registerComponentRenderModel(model: ComponentRenderModel): void {
    if (!this.validateComponentRenderModel(model)) return;
    if (this.componentRenderRegistry.has(model.componentRenderId)) {
      console.warn(`[Runtime Diagnostics] duplicate component render IDs: ID "${model.componentRenderId}" already exists.`);
    }
    this.componentRenderRegistry.set(model.componentRenderId, JSON.parse(JSON.stringify(model)));
    if (!this.componentRenderOrder.includes(model.componentRenderId)) {
      this.componentRenderOrder.push(model.componentRenderId);
    }
  }

  public getComponentRenderModel(id: string): ComponentRenderModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed component render: ID must be a non-empty string.');
      return undefined;
    }
    const model = this.componentRenderRegistry.get(id);
    return model ? JSON.parse(JSON.stringify(model)) : undefined;
  }

  public getComponentRenderModels(): ComponentRenderModel[] {
    return this.componentRenderOrder
      .map(id => this.componentRenderRegistry.get(id))
      .filter((m): m is ComponentRenderModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateComponentRenderModel(id: string, updates: Partial<ComponentRenderModel>): void {
    const existing = this.componentRenderRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing component render: Model "${id}" not found.`);
      return;
    }
    const merged: ComponentRenderModel = {
      ...existing,
      ...updates,
      componentRenderId: existing.componentRenderId,
    };
    this.registerComponentRenderModel(merged);
  }

  public removeComponentRenderModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed component render: ID must be a non-empty string.');
      return;
    }
    this.componentRenderRegistry.delete(id);
    this.componentRenderOrder = this.componentRenderOrder.filter(existing => existing !== id);
  }

  public clearComponentRenderModels(): void {
    this.componentRenderRegistry.clear();
    this.componentRenderOrder = [];
  }

  public getComponentRenderModelKeys(): string[] {
    return [...this.componentRenderOrder];
  }

  public hasComponentRenderModel(id: string): boolean {
    return this.componentRenderRegistry.has(id);
  }

  private validateComponentBoundsModel(bounds: ComponentBoundsModel): boolean {
    if (!bounds || typeof bounds.componentRenderId !== 'string' || bounds.componentRenderId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed component bounds: Missing a valid componentRenderId.');
      return false;
    }
    if (typeof bounds.x !== 'number' || !Number.isFinite(bounds.x)) {
      console.warn(`[Runtime Diagnostics] invalid component bounds: Bounds for "${bounds.componentRenderId}" has invalid x.`);
      return false;
    }
    if (typeof bounds.y !== 'number' || !Number.isFinite(bounds.y)) {
      console.warn(`[Runtime Diagnostics] invalid component bounds: Bounds for "${bounds.componentRenderId}" has invalid y.`);
      return false;
    }
    if (typeof bounds.width !== 'number' || !Number.isFinite(bounds.width) || bounds.width < 0) {
      console.warn(`[Runtime Diagnostics] invalid component bounds: Bounds for "${bounds.componentRenderId}" has invalid width.`);
      return false;
    }
    if (typeof bounds.height !== 'number' || !Number.isFinite(bounds.height) || bounds.height < 0) {
      console.warn(`[Runtime Diagnostics] invalid component bounds: Bounds for "${bounds.componentRenderId}" has invalid height.`);
      return false;
    }
    if (typeof bounds.rotation !== 'number' || !Number.isFinite(bounds.rotation)) {
      console.warn(`[Runtime Diagnostics] invalid component bounds: Bounds for "${bounds.componentRenderId}" has invalid rotation.`);
      return false;
    }
    if (typeof bounds.scale !== 'number' || !Number.isFinite(bounds.scale) || bounds.scale <= 0) {
      console.warn(`[Runtime Diagnostics] invalid component bounds: Bounds for "${bounds.componentRenderId}" has invalid scale.`);
      return false;
    }
    if (!Array.isArray(bounds.anchorPoints)) {
      console.warn(`[Runtime Diagnostics] malformed component bounds: Bounds for "${bounds.componentRenderId}" has invalid anchorPoints.`);
      return false;
    }
    if (typeof bounds.futureLayoutHints !== 'object' || bounds.futureLayoutHints === null || Array.isArray(bounds.futureLayoutHints)) {
      console.warn(`[Runtime Diagnostics] malformed component bounds: Bounds for "${bounds.componentRenderId}" has invalid futureLayoutHints.`);
      return false;
    }
    return true;
  }

  public registerComponentBoundsModel(bounds: ComponentBoundsModel): void {
    if (!this.validateComponentBoundsModel(bounds)) return;
    if (this.componentBoundsRegistry.has(bounds.componentRenderId)) {
      console.warn(`[Runtime Diagnostics] duplicate component bounds key: ID "${bounds.componentRenderId}" already exists.`);
    }
    this.componentBoundsRegistry.set(bounds.componentRenderId, JSON.parse(JSON.stringify(bounds)));
    if (!this.componentBoundsOrder.includes(bounds.componentRenderId)) {
      this.componentBoundsOrder.push(bounds.componentRenderId);
    }
  }

  public getComponentBoundsModel(id: string): ComponentBoundsModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed component bounds: ID must be a non-empty string.');
      return undefined;
    }
    const bounds = this.componentBoundsRegistry.get(id);
    return bounds ? JSON.parse(JSON.stringify(bounds)) : undefined;
  }

  public getComponentBoundsModels(): ComponentBoundsModel[] {
    return this.componentBoundsOrder
      .map(id => this.componentBoundsRegistry.get(id))
      .filter((b): b is ComponentBoundsModel => !!b)
      .map(b => JSON.parse(JSON.stringify(b)));
  }

  public updateComponentBoundsModel(id: string, updates: Partial<ComponentBoundsModel>): void {
    const existing = this.componentBoundsRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing component bounds: Bounds "${id}" not found.`);
      return;
    }
    const merged: ComponentBoundsModel = {
      ...existing,
      ...updates,
      componentRenderId: existing.componentRenderId,
      anchorPoints: updates.anchorPoints ? updates.anchorPoints.map(ap => ({ ...ap })) : existing.anchorPoints.map(ap => ({ ...ap })),
    };
    this.registerComponentBoundsModel(merged);
  }

  public removeComponentBoundsModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed component bounds: ID must be a non-empty string.');
      return;
    }
    this.componentBoundsRegistry.delete(id);
    this.componentBoundsOrder = this.componentBoundsOrder.filter(existing => existing !== id);
  }

  public clearComponentBoundsModels(): void {
    this.componentBoundsRegistry.clear();
    this.componentBoundsOrder = [];
  }

  public getComponentBoundsModelKeys(): string[] {
    return [...this.componentBoundsOrder];
  }

  public hasComponentBoundsModel(id: string): boolean {
    return this.componentBoundsRegistry.has(id);
  }

  private validateComponentLabelModel(label: ComponentLabelModel): boolean {
    if (!label || typeof label.labelId !== 'string' || label.labelId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed component label: Missing a valid labelId.');
      return false;
    }
    if (typeof label.labelText !== 'string' || label.labelText.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed component label: Label "${label.labelId}" has empty labelText.`);
      return false;
    }
    if (!BaseRuntime.VALID_LABEL_POSITIONS.includes(label.position)) {
      console.warn(`[Runtime Diagnostics] invalid label positions: Label "${label.labelId}" has invalid position "${label.position}".`);
      return false;
    }
    if (!BaseRuntime.VALID_VISIBILITY_STATES.includes(label.visibility)) {
      console.warn(`[Runtime Diagnostics] invalid visibility states: Label "${label.labelId}" has invalid visibility "${label.visibility}".`);
      return false;
    }
    if (typeof label.futureStylingHints !== 'object' || label.futureStylingHints === null || Array.isArray(label.futureStylingHints)) {
      console.warn(`[Runtime Diagnostics] malformed component label: Label "${label.labelId}" has invalid futureStylingHints.`);
      return false;
    }
    return true;
  }

  public registerComponentLabelModel(label: ComponentLabelModel): void {
    if (!this.validateComponentLabelModel(label)) return;
    if (this.componentLabelRegistry.has(label.labelId)) {
      console.warn(`[Runtime Diagnostics] duplicate component label IDs: ID "${label.labelId}" already exists.`);
    }
    this.componentLabelRegistry.set(label.labelId, JSON.parse(JSON.stringify(label)));
    if (!this.componentLabelOrder.includes(label.labelId)) {
      this.componentLabelOrder.push(label.labelId);
    }
  }

  public getComponentLabelModel(id: string): ComponentLabelModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed component label: ID must be a non-empty string.');
      return undefined;
    }
    const label = this.componentLabelRegistry.get(id);
    return label ? JSON.parse(JSON.stringify(label)) : undefined;
  }

  public getComponentLabelModels(): ComponentLabelModel[] {
    return this.componentLabelOrder
      .map(id => this.componentLabelRegistry.get(id))
      .filter((l): l is ComponentLabelModel => !!l)
      .map(l => JSON.parse(JSON.stringify(l)));
  }

  public updateComponentLabelModel(id: string, updates: Partial<ComponentLabelModel>): void {
    const existing = this.componentLabelRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing component label: Label "${id}" not found.`);
      return;
    }
    const merged: ComponentLabelModel = {
      ...existing,
      ...updates,
      labelId: existing.labelId,
    };
    this.registerComponentLabelModel(merged);
  }

  public removeComponentLabelModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed component label: ID must be a non-empty string.');
      return;
    }
    this.componentLabelRegistry.delete(id);
    this.componentLabelOrder = this.componentLabelOrder.filter(existing => existing !== id);
  }

  public clearComponentLabelModels(): void {
    this.componentLabelRegistry.clear();
    this.componentLabelOrder = [];
  }

  public getComponentLabelModelKeys(): string[] {
    return [...this.componentLabelOrder];
  }

  public hasComponentLabelModel(id: string): boolean {
    return this.componentLabelRegistry.has(id);
  }

  private validateComponentPinRenderModel(pin: ComponentPinRenderModel): boolean {
    if (!pin || typeof pin.pinRenderId !== 'string' || pin.pinRenderId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed component pin render: Missing a valid pinRenderId.');
      return false;
    }
    if (typeof pin.pinId !== 'string' || pin.pinId.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed component pin render: Pin render "${pin.pinRenderId}" has invalid pinId.`);
      return false;
    }
    if (typeof pin.pinType !== 'string' || pin.pinType.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed component pin render: Pin render "${pin.pinRenderId}" has invalid pinType.`);
      return false;
    }
    if (!pin.pinPosition || typeof pin.pinPosition.x !== 'number' || typeof pin.pinPosition.y !== 'number') {
      console.warn(`[Runtime Diagnostics] malformed component pin render: Pin render "${pin.pinRenderId}" has invalid pinPosition.`);
      return false;
    }
    if (typeof pin.pinDirection !== 'string' || !(['INPUT', 'OUTPUT', 'BIDIRECTIONAL'] as string[]).includes(pin.pinDirection)) {
      console.warn(`[Runtime Diagnostics] invalid pin direction: Pin render "${pin.pinRenderId}" has invalid pinDirection "${pin.pinDirection}".`);
      return false;
    }
    if (typeof pin.futureConnectionHints !== 'object' || pin.futureConnectionHints === null || Array.isArray(pin.futureConnectionHints)) {
      console.warn(`[Runtime Diagnostics] malformed component pin render: Pin render "${pin.pinRenderId}" has invalid futureConnectionHints.`);
      return false;
    }
    return true;
  }

  public registerComponentPinRenderModel(pin: ComponentPinRenderModel): void {
    if (!this.validateComponentPinRenderModel(pin)) return;
    if (this.componentPinRenderRegistry.has(pin.pinRenderId)) {
      console.warn(`[Runtime Diagnostics] duplicate component pin render IDs: ID "${pin.pinRenderId}" already exists.`);
    }
    this.componentPinRenderRegistry.set(pin.pinRenderId, JSON.parse(JSON.stringify(pin)));
    if (!this.componentPinRenderOrder.includes(pin.pinRenderId)) {
      this.componentPinRenderOrder.push(pin.pinRenderId);
    }
  }

  public getComponentPinRenderModel(id: string): ComponentPinRenderModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed component pin render: ID must be a non-empty string.');
      return undefined;
    }
    const pin = this.componentPinRenderRegistry.get(id);
    return pin ? JSON.parse(JSON.stringify(pin)) : undefined;
  }

  public getComponentPinRenderModels(): ComponentPinRenderModel[] {
    return this.componentPinRenderOrder
      .map(id => this.componentPinRenderRegistry.get(id))
      .filter((p): p is ComponentPinRenderModel => !!p)
      .map(p => JSON.parse(JSON.stringify(p)));
  }

  public updateComponentPinRenderModel(id: string, updates: Partial<ComponentPinRenderModel>): void {
    const existing = this.componentPinRenderRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing component pin render: Pin "${id}" not found.`);
      return;
    }
    const merged: ComponentPinRenderModel = {
      ...existing,
      ...updates,
      pinRenderId: existing.pinRenderId,
      pinPosition: updates.pinPosition ? { ...updates.pinPosition } : { ...existing.pinPosition },
    };
    this.registerComponentPinRenderModel(merged);
  }

  public removeComponentPinRenderModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed component pin render: ID must be a non-empty string.');
      return;
    }
    this.componentPinRenderRegistry.delete(id);
    this.componentPinRenderOrder = this.componentPinRenderOrder.filter(existing => existing !== id);
  }

  public clearComponentPinRenderModels(): void {
    this.componentPinRenderRegistry.clear();
    this.componentPinRenderOrder = [];
  }

  public getComponentPinRenderModelKeys(): string[] {
    return [...this.componentPinRenderOrder];
  }

  public hasComponentPinRenderModel(id: string): boolean {
    return this.componentPinRenderRegistry.has(id);
  }

  // ─── Phase 12C: Wire Rendering Registry ───────────────────────

  private validateWireRenderModel(model: WireRenderModel): boolean {
    if (!model || typeof model.wireRenderId !== 'string' || model.wireRenderId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed wire render: Missing a valid wireRenderId.');
      return false;
    }
    if (typeof model.wireId !== 'string' || model.wireId.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed wire render: Wire render "${model.wireRenderId}" has invalid wireId.`);
      return false;
    }
    if (typeof model.wireType !== 'string' || model.wireType.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed wire render: Wire render "${model.wireRenderId}" has invalid wireType.`);
      return false;
    }
    if (typeof model.displayName !== 'string' || model.displayName.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed wire render: Wire render "${model.wireRenderId}" has empty displayName.`);
      return false;
    }
    if (typeof model.renderNodeId !== 'string' || model.renderNodeId.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed wire render: Wire render "${model.wireRenderId}" has invalid renderNodeId.`);
      return false;
    }
    if (typeof model.layerId !== 'string' || model.layerId.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed wire render: Wire render "${model.wireRenderId}" has invalid layerId.`);
      return false;
    }
    if (!BaseRuntime.VALID_VISIBILITY_STATES.includes(model.visibilityState)) {
      console.warn(`[Runtime Diagnostics] invalid visibility states: Wire render "${model.wireRenderId}" has invalid visibilityState "${model.visibilityState}".`);
      return false;
    }
    if (typeof model.selectionState !== 'boolean') {
      console.warn(`[Runtime Diagnostics] malformed wire render: Wire render "${model.wireRenderId}" selectionState must be a boolean.`);
      return false;
    }
    if (typeof model.focusState !== 'boolean') {
      console.warn(`[Runtime Diagnostics] malformed wire render: Wire render "${model.wireRenderId}" focusState must be a boolean.`);
      return false;
    }
    if (typeof model.futureRendererHints !== 'object' || model.futureRendererHints === null || Array.isArray(model.futureRendererHints)) {
      console.warn(`[Runtime Diagnostics] malformed wire render: Wire render "${model.wireRenderId}" has invalid futureRendererHints.`);
      return false;
    }
    return true;
  }

  private validateWirePathModel(path: WirePathModel): boolean {
    if (!path || typeof path.pathId !== 'string' || path.pathId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed wire path: Missing a valid pathId.');
      return false;
    }
    if (typeof path.startAnchor !== 'string' || path.startAnchor.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed wire path: Wire path "${path.pathId}" has invalid startAnchor.`);
      return false;
    }
    if (typeof path.endAnchor !== 'string' || path.endAnchor.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed wire path: Wire path "${path.pathId}" has invalid endAnchor.`);
      return false;
    }
    if (!Array.isArray(path.controlPoints)) {
      console.warn(`[Runtime Diagnostics] malformed wire path: Wire path "${path.pathId}" controlPoints must be an array.`);
      return false;
    } else {
      for (let i = 0; i < path.controlPoints.length; i++) {
        const cp = path.controlPoints[i];
        if (!cp || typeof cp.x !== 'number' || !Number.isFinite(cp.x) || typeof cp.y !== 'number' || !Number.isFinite(cp.y)) {
          console.warn(`[Runtime Diagnostics] malformed wire path: Wire path "${path.pathId}" controlPoint at index ${i} is invalid.`);
          return false;
        }
      }
    }
    if (typeof path.routingMetadata !== 'object' || path.routingMetadata === null || Array.isArray(path.routingMetadata)) {
      console.warn(`[Runtime Diagnostics] malformed wire path: Wire path "${path.pathId}" has invalid routingMetadata.`);
      return false;
    }
    if (typeof path.futureOptimizationHints !== 'object' || path.futureOptimizationHints === null || Array.isArray(path.futureOptimizationHints)) {
      console.warn(`[Runtime Diagnostics] malformed wire path: Wire path "${path.pathId}" has invalid futureOptimizationHints.`);
      return false;
    }
    return true;
  }

  private validateWireSegmentModel(segment: WireSegmentModel): boolean {
    if (!segment || typeof segment.segmentId !== 'string' || segment.segmentId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed wire segment: Missing a valid segmentId.');
      return false;
    }
    if (typeof segment.segmentType !== 'string' || segment.segmentType.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed wire segment: Wire segment "${segment.segmentId}" has invalid segmentType.`);
      return false;
    }
    if (!segment.segmentBounds || typeof segment.segmentBounds !== 'object' || Array.isArray(segment.segmentBounds)) {
      console.warn(`[Runtime Diagnostics] malformed wire segment: Wire segment "${segment.segmentId}" has invalid segmentBounds.`);
      return false;
    } else {
      const b = segment.segmentBounds;
      if (typeof b.x !== 'number' || !Number.isFinite(b.x) || typeof b.y !== 'number' || !Number.isFinite(b.y) ||
          typeof b.width !== 'number' || !Number.isFinite(b.width) || b.width < 0 ||
          typeof b.height !== 'number' || !Number.isFinite(b.height) || b.height < 0) {
        console.warn(`[Runtime Diagnostics] invalid wire segment: Wire segment "${segment.segmentId}" bounds values are invalid.`);
        return false;
      }
    }
    if (!segment.segmentDirection || typeof segment.segmentDirection !== 'object' || Array.isArray(segment.segmentDirection)) {
      console.warn(`[Runtime Diagnostics] malformed wire segment: Wire segment "${segment.segmentId}" has invalid segmentDirection.`);
      return false;
    } else {
      const d = segment.segmentDirection;
      if (typeof d.x !== 'number' || !Number.isFinite(d.x) || typeof d.y !== 'number' || !Number.isFinite(d.y)) {
        console.warn(`[Runtime Diagnostics] invalid wire segment: Wire segment "${segment.segmentId}" direction values are invalid.`);
        return false;
      }
    }
    if (typeof segment.futureRoutingHints !== 'object' || segment.futureRoutingHints === null || Array.isArray(segment.futureRoutingHints)) {
      console.warn(`[Runtime Diagnostics] malformed wire segment: Wire segment "${segment.segmentId}" has invalid futureRoutingHints.`);
      return false;
    }
    return true;
  }

  private validateWireAnchorModel(anchor: WireAnchorModel): boolean {
    if (!anchor || typeof anchor.anchorId !== 'string' || anchor.anchorId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed wire anchor: Missing a valid anchorId.');
      return false;
    }
    if (typeof anchor.anchorType !== 'string' || anchor.anchorType.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed wire anchor: Wire anchor "${anchor.anchorId}" has invalid anchorType.`);
      return false;
    }
    if (!anchor.anchorPosition || typeof anchor.anchorPosition !== 'object' || Array.isArray(anchor.anchorPosition)) {
      console.warn(`[Runtime Diagnostics] malformed wire anchor: Wire anchor "${anchor.anchorId}" has invalid anchorPosition.`);
      return false;
    } else {
      const p = anchor.anchorPosition;
      if (typeof p.x !== 'number' || !Number.isFinite(p.x) || typeof p.y !== 'number' || !Number.isFinite(p.y)) {
        console.warn(`[Runtime Diagnostics] invalid wire anchor: Wire anchor "${anchor.anchorId}" position values are invalid.`);
        return false;
      }
    }
    if (typeof anchor.anchorOwner !== 'string' || anchor.anchorOwner.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed wire anchor: Wire anchor "${anchor.anchorId}" has invalid anchorOwner.`);
      return false;
    }
    if (typeof anchor.futureConnectionHints !== 'object' || anchor.futureConnectionHints === null || Array.isArray(anchor.futureConnectionHints)) {
      console.warn(`[Runtime Diagnostics] malformed wire anchor: Wire anchor "${anchor.anchorId}" has invalid futureConnectionHints.`);
      return false;
    }
    return true;
  }

  // ─── Phase 12D Board Rendering private validators ───
  private validateBoardRenderModel(model: BoardRenderModel): boolean {
    const warnings = validateBoardRenderModel(model, '[Runtime Diagnostics] malformed board render:');
    return warnings.length === 0;
  }

  private validateBoardBoundsModel(bounds: BoardBoundsModel): boolean {
    const warnings = validateBoardBoundsModel(bounds, '[Runtime Diagnostics] malformed board bounds:');
    return warnings.length === 0;
  }

  private validateBoardConnectorModel(connector: BoardConnectorModel): boolean {
    const warnings = validateBoardConnectorModel(connector, '[Runtime Diagnostics] malformed board connector:');
    return warnings.length === 0;
  }

  private validateBoardRegionModel(region: BoardRegionModel): boolean {
    const warnings = validateBoardRegionModel(region, '[Runtime Diagnostics] malformed board region:');
    return warnings.length === 0;
  }

  // ─── Phase 13A Signal Effects private validators ───
  private validateSignalEffectModel(model: SignalEffectModel): boolean {
    const warnings = validateSignalEffectModel(model, '[Runtime Diagnostics] malformed signal effect:');
    return warnings.length === 0;
  }

  private validateSignalPropagationModel(propagation: SignalPropagationModel): boolean {
    const warnings = validateSignalPropagationModel(propagation, '[Runtime Diagnostics] malformed signal propagation:');
    return warnings.length === 0;
  }

  private validateSignalColorModel(color: SignalColorModel): boolean {
    const warnings = validateSignalColorModel(color, '[Runtime Diagnostics] malformed signal color:');
    return warnings.length === 0;
  }

  private validateSignalActivityModel(activity: SignalActivityModel): boolean {
    const warnings = validateSignalActivityModel(activity, '[Runtime Diagnostics] malformed signal activity:');
    return warnings.length === 0;
  }

  // ─── Phase 13B Visual Themes private validators ───
  private validateThemeModel(model: ThemeModel): boolean {
    const warnings = validateThemeModel(model, '[Runtime Diagnostics] malformed theme:');
    return warnings.length === 0;
  }

  private validateColorPaletteModel(palette: ColorPaletteModel): boolean {
    const warnings = validateColorPaletteModel(palette, '[Runtime Diagnostics] malformed color palette:');
    return warnings.length === 0;
  }

  private validateComponentStyleModel(style: ComponentStyleModel): boolean {
    const warnings = validateComponentStyleModel(style, '[Runtime Diagnostics] malformed component style:');
    return warnings.length === 0;
  }

  private validateWorkspaceStyleModel(ws: WorkspaceStyleModel): boolean {
    const warnings = validateWorkspaceStyleModel(ws, '[Runtime Diagnostics] malformed workspace style:');
    return warnings.length === 0;
  }

  // ─── Phase 13C Animation Playback private validators ───
  private validateAnimationPlaybackModel(model: AnimationPlaybackModel): boolean {
    const warnings = validateAnimationPlaybackModel(model, '[Runtime Diagnostics] malformed animation playback:');
    return warnings.length === 0;
  }

  private validateTimelineModel(model: TimelineModel): boolean {
    const warnings = validateTimelineModel(model, '[Runtime Diagnostics] malformed timeline:');
    return warnings.length === 0;
  }

  private validateKeyframeModel(model: KeyframeModel): boolean {
    const warnings = validateKeyframeModel(model, '[Runtime Diagnostics] malformed keyframe:');
    return warnings.length === 0;
  }

  private validatePlaybackGroupModel(model: PlaybackGroupModel): boolean {
    const warnings = validatePlaybackGroupModel(model, '[Runtime Diagnostics] malformed playback group:');
    return warnings.length === 0;
  }

  // ─── Phase 14A Visual Rendering Runtime Foundation private validators ───
  private validateRenderRuntimeModel(model: RenderRuntimeModel): boolean {
    const warnings = validateRenderRuntimeModel(model, '[Runtime Diagnostics] malformed render runtime:');
    return warnings.length === 0;
  }

  private validateRenderPassModel(model: RenderPassModel): boolean {
    const warnings = validateRenderPassModel(model, '[Runtime Diagnostics] malformed render pass:');
    return warnings.length === 0;
  }

  private validateRenderLayerRuntimeModel(model: RenderLayerRuntimeModel): boolean {
    const warnings = validateRenderLayerRuntimeModel(model, '[Runtime Diagnostics] malformed render layer runtime:');
    return warnings.length === 0;
  }

  private validateRenderQueueModel(model: RenderQueueModel): boolean {
    const warnings = validateRenderQueueModel(model, '[Runtime Diagnostics] malformed render queue:');
    return warnings.length === 0;
  }

  private validateFrameMetadataModel(model: FrameMetadataModel): boolean {
    const warnings = validateFrameMetadataModel(model, '[Runtime Diagnostics] malformed frame metadata:');
    return warnings.length === 0;
  }


  // ─── Wire Render Model CRUD ───
  public registerWireRenderModel(model: WireRenderModel): void {
    if (!this.validateWireRenderModel(model)) return;
    if (this.wireRenderRegistry.has(model.wireRenderId)) {
      console.warn(`[Runtime Diagnostics] duplicate wire render IDs: ID "${model.wireRenderId}" already exists.`);
    }
    this.wireRenderRegistry.set(model.wireRenderId, JSON.parse(JSON.stringify(model)));
    if (!this.wireRenderOrder.includes(model.wireRenderId)) {
      this.wireRenderOrder.push(model.wireRenderId);
    }
  }

  public getWireRenderModel(id: string): WireRenderModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed wire render: ID must be a non-empty string.');
      return undefined;
    }
    const model = this.wireRenderRegistry.get(id);
    return model ? JSON.parse(JSON.stringify(model)) : undefined;
  }

  public getWireRenderModels(): WireRenderModel[] {
    return this.wireRenderOrder
      .map(id => this.wireRenderRegistry.get(id))
      .filter((m): m is WireRenderModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateWireRenderModel(id: string, updates: Partial<WireRenderModel>): void {
    const existing = this.wireRenderRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing wire render: Model "${id}" not found.`);
      return;
    }
    const merged: WireRenderModel = {
      ...existing,
      ...updates,
      wireRenderId: existing.wireRenderId,
    };
    this.registerWireRenderModel(merged);
  }

  public removeWireRenderModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed wire render: ID must be a non-empty string.');
      return;
    }
    this.wireRenderRegistry.delete(id);
    this.wireRenderOrder = this.wireRenderOrder.filter(existing => existing !== id);
  }

  public clearWireRenderModels(): void {
    this.wireRenderRegistry.clear();
    this.wireRenderOrder = [];
  }

  public getWireRenderModelKeys(): string[] {
    return [...this.wireRenderOrder];
  }

  public hasWireRenderModel(id: string): boolean {
    return this.wireRenderRegistry.has(id);
  }

  // ─── Wire Path Model CRUD ───
  public registerWirePathModel(path: WirePathModel): void {
    if (!this.validateWirePathModel(path)) return;
    if (this.wirePathRegistry.has(path.pathId)) {
      console.warn(`[Runtime Diagnostics] duplicate wire path IDs: ID "${path.pathId}" already exists.`);
    }
    this.wirePathRegistry.set(path.pathId, JSON.parse(JSON.stringify(path)));
    if (!this.wirePathOrder.includes(path.pathId)) {
      this.wirePathOrder.push(path.pathId);
    }
  }

  public getWirePathModel(id: string): WirePathModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed wire path: ID must be a non-empty string.');
      return undefined;
    }
    const model = this.wirePathRegistry.get(id);
    return model ? JSON.parse(JSON.stringify(model)) : undefined;
  }

  public getWirePathModels(): WirePathModel[] {
    return this.wirePathOrder
      .map(id => this.wirePathRegistry.get(id))
      .filter((m): m is WirePathModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateWirePathModel(id: string, updates: Partial<WirePathModel>): void {
    const existing = this.wirePathRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing wire path: Model "${id}" not found.`);
      return;
    }
    const merged: WirePathModel = {
      ...existing,
      ...updates,
      pathId: existing.pathId,
    };
    this.registerWirePathModel(merged);
  }

  public removeWirePathModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed wire path: ID must be a non-empty string.');
      return;
    }
    this.wirePathRegistry.delete(id);
    this.wirePathOrder = this.wirePathOrder.filter(existing => existing !== id);
  }

  public clearWirePathModels(): void {
    this.wirePathRegistry.clear();
    this.wirePathOrder = [];
  }

  public getWirePathModelKeys(): string[] {
    return [...this.wirePathOrder];
  }

  public hasWirePathModel(id: string): boolean {
    return this.wirePathRegistry.has(id);
  }

  // ─── Wire Segment Model CRUD ───
  public registerWireSegmentModel(segment: WireSegmentModel): void {
    if (!this.validateWireSegmentModel(segment)) return;
    if (this.wireSegmentRegistry.has(segment.segmentId)) {
      console.warn(`[Runtime Diagnostics] duplicate wire segment IDs: ID "${segment.segmentId}" already exists.`);
    }
    this.wireSegmentRegistry.set(segment.segmentId, JSON.parse(JSON.stringify(segment)));
    if (!this.wireSegmentOrder.includes(segment.segmentId)) {
      this.wireSegmentOrder.push(segment.segmentId);
    }
  }

  public getWireSegmentModel(id: string): WireSegmentModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed wire segment: ID must be a non-empty string.');
      return undefined;
    }
    const model = this.wireSegmentRegistry.get(id);
    return model ? JSON.parse(JSON.stringify(model)) : undefined;
  }

  public getWireSegmentModels(): WireSegmentModel[] {
    return this.wireSegmentOrder
      .map(id => this.wireSegmentRegistry.get(id))
      .filter((m): m is WireSegmentModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateWireSegmentModel(id: string, updates: Partial<WireSegmentModel>): void {
    const existing = this.wireSegmentRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing wire segment: Model "${id}" not found.`);
      return;
    }
    const merged: WireSegmentModel = {
      ...existing,
      ...updates,
      segmentId: existing.segmentId,
    };
    this.registerWireSegmentModel(merged);
  }

  public removeWireSegmentModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed wire segment: ID must be a non-empty string.');
      return;
    }
    this.wireSegmentRegistry.delete(id);
    this.wireSegmentOrder = this.wireSegmentOrder.filter(existing => existing !== id);
  }

  public clearWireSegmentModels(): void {
    this.wireSegmentRegistry.clear();
    this.wireSegmentOrder = [];
  }

  public getWireSegmentModelKeys(): string[] {
    return [...this.wireSegmentOrder];
  }

  public hasWireSegmentModel(id: string): boolean {
    return this.wireSegmentRegistry.has(id);
  }

  // ─── Wire Anchor Model CRUD ───
  public registerWireAnchorModel(anchor: WireAnchorModel): void {
    if (!this.validateWireAnchorModel(anchor)) return;
    if (this.wireAnchorRegistry.has(anchor.anchorId)) {
      console.warn(`[Runtime Diagnostics] duplicate wire anchor IDs: ID "${anchor.anchorId}" already exists.`);
    }
    this.wireAnchorRegistry.set(anchor.anchorId, JSON.parse(JSON.stringify(anchor)));
    if (!this.wireAnchorOrder.includes(anchor.anchorId)) {
      this.wireAnchorOrder.push(anchor.anchorId);
    }
  }

  public getWireAnchorModel(id: string): WireAnchorModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed wire anchor: ID must be a non-empty string.');
      return undefined;
    }
    const model = this.wireAnchorRegistry.get(id);
    return model ? JSON.parse(JSON.stringify(model)) : undefined;
  }

  public getWireAnchorModels(): WireAnchorModel[] {
    return this.wireAnchorOrder
      .map(id => this.wireAnchorRegistry.get(id))
      .filter((m): m is WireAnchorModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateWireAnchorModel(id: string, updates: Partial<WireAnchorModel>): void {
    const existing = this.wireAnchorRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing wire anchor: Model "${id}" not found.`);
      return;
    }
    const merged: WireAnchorModel = {
      ...existing,
      ...updates,
      anchorId: existing.anchorId,
    };
    this.registerWireAnchorModel(merged);
  }

  public removeWireAnchorModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed wire anchor: ID must be a non-empty string.');
      return;
    }
    this.wireAnchorRegistry.delete(id);
    this.wireAnchorOrder = this.wireAnchorOrder.filter(existing => existing !== id);
  }

  public clearWireAnchorModels(): void {
    this.wireAnchorRegistry.clear();
    this.wireAnchorOrder = [];
  }

  public getWireAnchorModelKeys(): string[] {
    return [...this.wireAnchorOrder];
  }

  public hasWireAnchorModel(id: string): boolean {
    return this.wireAnchorRegistry.has(id);
  }

  // ─── Board Render Model CRUD ───
  public registerBoardRenderModel(model: BoardRenderModel): void {
    if (!this.validateBoardRenderModel(model)) return;
    if (this.boardRenderRegistry.has(model.boardRenderId)) {
      console.warn(`[Runtime Diagnostics] duplicate board render IDs: ID "${model.boardRenderId}" already exists.`);
    }
    this.boardRenderRegistry.set(model.boardRenderId, JSON.parse(JSON.stringify(model)));
    if (!this.boardRenderOrder.includes(model.boardRenderId)) {
      this.boardRenderOrder.push(model.boardRenderId);
    }
  }

  public getBoardRenderModel(id: string): BoardRenderModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed board render: ID must be a non-empty string.');
      return undefined;
    }
    const model = this.boardRenderRegistry.get(id);
    return model ? JSON.parse(JSON.stringify(model)) : undefined;
  }

  public getBoardRenderModels(): BoardRenderModel[] {
    return this.boardRenderOrder
      .map(id => this.boardRenderRegistry.get(id))
      .filter((m): m is BoardRenderModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateBoardRenderModel(id: string, updates: Partial<BoardRenderModel>): void {
    const existing = this.boardRenderRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing board render: Model "${id}" not found.`);
      return;
    }
    const merged: BoardRenderModel = {
      ...existing,
      ...updates,
      boardRenderId: existing.boardRenderId,
    };
    this.registerBoardRenderModel(merged);
  }

  public removeBoardRenderModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed board render: ID must be a non-empty string.');
      return;
    }
    this.boardRenderRegistry.delete(id);
    this.boardRenderOrder = this.boardRenderOrder.filter(existing => existing !== id);
  }

  public clearBoardRenderModels(): void {
    this.boardRenderRegistry.clear();
    this.boardRenderOrder = [];
  }

  public getBoardRenderModelKeys(): string[] {
    return [...this.boardRenderOrder];
  }

  public hasBoardRenderModel(id: string): boolean {
    return this.boardRenderRegistry.has(id);
  }

  // ─── Board Bounds Model CRUD ───
  public registerBoardBoundsModel(bounds: BoardBoundsModel): void {
    if (!this.validateBoardBoundsModel(bounds)) return;
    if (this.boardBoundsRegistry.has(bounds.boundsId)) {
      console.warn(`[Runtime Diagnostics] duplicate board bounds IDs: ID "${bounds.boundsId}" already exists.`);
    }
    this.boardBoundsRegistry.set(bounds.boundsId, JSON.parse(JSON.stringify(bounds)));
    if (!this.boardBoundsOrder.includes(bounds.boundsId)) {
      this.boardBoundsOrder.push(bounds.boundsId);
    }
  }

  public getBoardBoundsModel(id: string): BoardBoundsModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed board bounds: ID must be a non-empty string.');
      return undefined;
    }
    const bounds = this.boardBoundsRegistry.get(id);
    return bounds ? JSON.parse(JSON.stringify(bounds)) : undefined;
  }

  public getBoardBoundsModels(): BoardBoundsModel[] {
    return this.boardBoundsOrder
      .map(id => this.boardBoundsRegistry.get(id))
      .filter((m): m is BoardBoundsModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateBoardBoundsModel(id: string, updates: Partial<BoardBoundsModel>): void {
    const existing = this.boardBoundsRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing board bounds: Model "${id}" not found.`);
      return;
    }
    const merged: BoardBoundsModel = {
      ...existing,
      ...updates,
      boundsId: existing.boundsId,
    };
    this.registerBoardBoundsModel(merged);
  }

  public removeBoardBoundsModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed board bounds: ID must be a non-empty string.');
      return;
    }
    this.boardBoundsRegistry.delete(id);
    this.boardBoundsOrder = this.boardBoundsOrder.filter(existing => existing !== id);
  }

  public clearBoardBoundsModels(): void {
    this.boardBoundsRegistry.clear();
    this.boardBoundsOrder = [];
  }

  public getBoardBoundsModelKeys(): string[] {
    return [...this.boardBoundsOrder];
  }

  public hasBoardBoundsModel(id: string): boolean {
    return this.boardBoundsRegistry.has(id);
  }

  // ─── Board Connector Model CRUD ───
  public registerBoardConnectorModel(connector: BoardConnectorModel): void {
    if (!this.validateBoardConnectorModel(connector)) return;
    if (this.boardConnectorRegistry.has(connector.connectorId)) {
      console.warn(`[Runtime Diagnostics] duplicate board connector IDs: ID "${connector.connectorId}" already exists.`);
    }
    this.boardConnectorRegistry.set(connector.connectorId, JSON.parse(JSON.stringify(connector)));
    if (!this.boardConnectorOrder.includes(connector.connectorId)) {
      this.boardConnectorOrder.push(connector.connectorId);
    }
  }

  public getBoardConnectorModel(id: string): BoardConnectorModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed board connector: ID must be a non-empty string.');
      return undefined;
    }
    const connector = this.boardConnectorRegistry.get(id);
    return connector ? JSON.parse(JSON.stringify(connector)) : undefined;
  }

  public getBoardConnectorModels(): BoardConnectorModel[] {
    return this.boardConnectorOrder
      .map(id => this.boardConnectorRegistry.get(id))
      .filter((m): m is BoardConnectorModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateBoardConnectorModel(id: string, updates: Partial<BoardConnectorModel>): void {
    const existing = this.boardConnectorRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing board connector: Model "${id}" not found.`);
      return;
    }
    const merged: BoardConnectorModel = {
      ...existing,
      ...updates,
      connectorId: existing.connectorId,
    };
    this.registerBoardConnectorModel(merged);
  }

  public removeBoardConnectorModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed board connector: ID must be a non-empty string.');
      return;
    }
    this.boardConnectorRegistry.delete(id);
    this.boardConnectorOrder = this.boardConnectorOrder.filter(existing => existing !== id);
  }

  public clearBoardConnectorModels(): void {
    this.boardConnectorRegistry.clear();
    this.boardConnectorOrder = [];
  }

  public getBoardConnectorModelKeys(): string[] {
    return [...this.boardConnectorOrder];
  }

  public hasBoardConnectorModel(id: string): boolean {
    return this.boardConnectorRegistry.has(id);
  }

  // ─── Board Region Model CRUD ───
  public registerBoardRegionModel(region: BoardRegionModel): void {
    if (!this.validateBoardRegionModel(region)) return;
    if (this.boardRegionRegistry.has(region.regionId)) {
      console.warn(`[Runtime Diagnostics] duplicate board region IDs: ID "${region.regionId}" already exists.`);
    }
    this.boardRegionRegistry.set(region.regionId, JSON.parse(JSON.stringify(region)));
    if (!this.boardRegionOrder.includes(region.regionId)) {
      this.boardRegionOrder.push(region.regionId);
    }
  }

  public getBoardRegionModel(id: string): BoardRegionModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed board region: ID must be a non-empty string.');
      return undefined;
    }
    const region = this.boardRegionRegistry.get(id);
    return region ? JSON.parse(JSON.stringify(region)) : undefined;
  }

  public getBoardRegionModels(): BoardRegionModel[] {
    return this.boardRegionOrder
      .map(id => this.boardRegionRegistry.get(id))
      .filter((m): m is BoardRegionModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateBoardRegionModel(id: string, updates: Partial<BoardRegionModel>): void {
    const existing = this.boardRegionRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing board region: Model "${id}" not found.`);
      return;
    }
    const merged: BoardRegionModel = {
      ...existing,
      ...updates,
      regionId: existing.regionId,
    };
    this.registerBoardRegionModel(merged);
  }

  public removeBoardRegionModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed board region: ID must be a non-empty string.');
      return;
    }
    this.boardRegionRegistry.delete(id);
    this.boardRegionOrder = this.boardRegionOrder.filter(existing => existing !== id);
  }

  public clearBoardRegionModels(): void {
    this.boardRegionRegistry.clear();
    this.boardRegionOrder = [];
  }

  public getBoardRegionModelKeys(): string[] {
    return [...this.boardRegionOrder];
  }

  public hasBoardRegionModel(id: string): boolean {
    return this.boardRegionRegistry.has(id);
  }

  // ─── Signal Effect Model CRUD ───
  public registerSignalEffectModel(model: SignalEffectModel): void {
    if (!this.validateSignalEffectModel(model)) return;
    if (this.signalEffectRegistry.has(model.signalEffectId)) {
      console.warn(`[Runtime Diagnostics] duplicate signal effect IDs: ID "${model.signalEffectId}" already exists.`);
    }
    this.signalEffectRegistry.set(model.signalEffectId, JSON.parse(JSON.stringify(model)));
    if (!this.signalEffectOrder.includes(model.signalEffectId)) {
      this.signalEffectOrder.push(model.signalEffectId);
    }
  }

  public getSignalEffectModel(id: string): SignalEffectModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed signal effect: ID must be a non-empty string.');
      return undefined;
    }
    const model = this.signalEffectRegistry.get(id);
    return model ? JSON.parse(JSON.stringify(model)) : undefined;
  }

  public getSignalEffectModels(): SignalEffectModel[] {
    return this.signalEffectOrder
      .map(id => this.signalEffectRegistry.get(id))
      .filter((m): m is SignalEffectModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateSignalEffectModel(id: string, updates: Partial<SignalEffectModel>): void {
    const existing = this.signalEffectRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing signal effect: Model "${id}" not found.`);
      return;
    }
    const merged: SignalEffectModel = {
      ...existing,
      ...updates,
      signalEffectId: existing.signalEffectId,
    };
    this.registerSignalEffectModel(merged);
  }

  public removeSignalEffectModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed signal effect: ID must be a non-empty string.');
      return;
    }
    this.signalEffectRegistry.delete(id);
    this.signalEffectOrder = this.signalEffectOrder.filter(existing => existing !== id);
  }

  public clearSignalEffectModels(): void {
    this.signalEffectRegistry.clear();
    this.signalEffectOrder = [];
  }

  public getSignalEffectModelKeys(): string[] {
    return [...this.signalEffectOrder];
  }

  public hasSignalEffectModel(id: string): boolean {
    return this.signalEffectRegistry.has(id);
  }

  // ─── Signal Propagation Model CRUD ───
  public registerSignalPropagationModel(propagation: SignalPropagationModel): void {
    if (!this.validateSignalPropagationModel(propagation)) return;
    if (this.signalPropagationRegistry.has(propagation.propagationId)) {
      console.warn(`[Runtime Diagnostics] duplicate signal propagation IDs: ID "${propagation.propagationId}" already exists.`);
    }
    this.signalPropagationRegistry.set(propagation.propagationId, JSON.parse(JSON.stringify(propagation)));
    if (!this.signalPropagationOrder.includes(propagation.propagationId)) {
      this.signalPropagationOrder.push(propagation.propagationId);
    }
  }

  public getSignalPropagationModel(id: string): SignalPropagationModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed signal propagation: ID must be a non-empty string.');
      return undefined;
    }
    const prop = this.signalPropagationRegistry.get(id);
    return prop ? JSON.parse(JSON.stringify(prop)) : undefined;
  }

  public getSignalPropagationModels(): SignalPropagationModel[] {
    return this.signalPropagationOrder
      .map(id => this.signalPropagationRegistry.get(id))
      .filter((m): m is SignalPropagationModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateSignalPropagationModel(id: string, updates: Partial<SignalPropagationModel>): void {
    const existing = this.signalPropagationRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing signal propagation: Model "${id}" not found.`);
      return;
    }
    const merged: SignalPropagationModel = {
      ...existing,
      ...updates,
      propagationId: existing.propagationId,
    };
    this.registerSignalPropagationModel(merged);
  }

  public removeSignalPropagationModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed signal propagation: ID must be a non-empty string.');
      return;
    }
    this.signalPropagationRegistry.delete(id);
    this.signalPropagationOrder = this.signalPropagationOrder.filter(existing => existing !== id);
  }

  public clearSignalPropagationModels(): void {
    this.signalPropagationRegistry.clear();
    this.signalPropagationOrder = [];
  }

  public getSignalPropagationModelKeys(): string[] {
    return [...this.signalPropagationOrder];
  }

  public hasSignalPropagationModel(id: string): boolean {
    return this.signalPropagationRegistry.has(id);
  }

  // ─── Signal Color Model CRUD ───
  public registerSignalColorModel(color: SignalColorModel): void {
    if (!this.validateSignalColorModel(color)) return;
    if (this.signalColorRegistry.has(color.colorId)) {
      console.warn(`[Runtime Diagnostics] duplicate signal color IDs: ID "${color.colorId}" already exists.`);
    }
    this.signalColorRegistry.set(color.colorId, JSON.parse(JSON.stringify(color)));
    if (!this.signalColorOrder.includes(color.colorId)) {
      this.signalColorOrder.push(color.colorId);
    }
  }

  public getSignalColorModel(id: string): SignalColorModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed signal color: ID must be a non-empty string.');
      return undefined;
    }
    const color = this.signalColorRegistry.get(id);
    return color ? JSON.parse(JSON.stringify(color)) : undefined;
  }

  public getSignalColorModels(): SignalColorModel[] {
    return this.signalColorOrder
      .map(id => this.signalColorRegistry.get(id))
      .filter((m): m is SignalColorModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateSignalColorModel(id: string, updates: Partial<SignalColorModel>): void {
    const existing = this.signalColorRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing signal color: Model "${id}" not found.`);
      return;
    }
    const merged: SignalColorModel = {
      ...existing,
      ...updates,
      colorId: existing.colorId,
    };
    this.registerSignalColorModel(merged);
  }

  public removeSignalColorModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed signal color: ID must be a non-empty string.');
      return;
    }
    this.signalColorRegistry.delete(id);
    this.signalColorOrder = this.signalColorOrder.filter(existing => existing !== id);
  }

  public clearSignalColorModels(): void {
    this.signalColorRegistry.clear();
    this.signalColorOrder = [];
  }

  public getSignalColorModelKeys(): string[] {
    return [...this.signalColorOrder];
  }

  public hasSignalColorModel(id: string): boolean {
    return this.signalColorRegistry.has(id);
  }

  // ─── Signal Activity Model CRUD ───
  public registerSignalActivityModel(activity: SignalActivityModel): void {
    if (!this.validateSignalActivityModel(activity)) return;
    if (this.signalActivityRegistry.has(activity.activityId)) {
      console.warn(`[Runtime Diagnostics] duplicate signal activity IDs: ID "${activity.activityId}" already exists.`);
    }
    this.signalActivityRegistry.set(activity.activityId, JSON.parse(JSON.stringify(activity)));
    if (!this.signalActivityOrder.includes(activity.activityId)) {
      this.signalActivityOrder.push(activity.activityId);
    }
  }

  public getSignalActivityModel(id: string): SignalActivityModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed signal activity: ID must be a non-empty string.');
      return undefined;
    }
    const activity = this.signalActivityRegistry.get(id);
    return activity ? JSON.parse(JSON.stringify(activity)) : undefined;
  }

  public getSignalActivityModels(): SignalActivityModel[] {
    return this.signalActivityOrder
      .map(id => this.signalActivityRegistry.get(id))
      .filter((m): m is SignalActivityModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateSignalActivityModel(id: string, updates: Partial<SignalActivityModel>): void {
    const existing = this.signalActivityRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing signal activity: Model "${id}" not found.`);
      return;
    }
    const merged: SignalActivityModel = {
      ...existing,
      ...updates,
      activityId: existing.activityId,
    };
    this.registerSignalActivityModel(merged);
  }

  public removeSignalActivityModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed signal activity: ID must be a non-empty string.');
      return;
    }
    this.signalActivityRegistry.delete(id);
    this.signalActivityOrder = this.signalActivityOrder.filter(existing => existing !== id);
  }

  public clearSignalActivityModels(): void {
    this.signalActivityRegistry.clear();
    this.signalActivityOrder = [];
  }

  public getSignalActivityModelKeys(): string[] {
    return [...this.signalActivityOrder];
  }

  public hasSignalActivityModel(id: string): boolean {
    return this.signalActivityRegistry.has(id);
  }

  // ─── Theme Model CRUD ───
  public registerThemeModel(model: ThemeModel): void {
    if (!this.validateThemeModel(model)) return;
    if (this.themeRegistry.has(model.themeId)) {
      console.warn(`[Runtime Diagnostics] duplicate theme IDs: ID "${model.themeId}" already exists.`);
    }
    this.themeRegistry.set(model.themeId, JSON.parse(JSON.stringify(model)));
    if (!this.themeOrder.includes(model.themeId)) {
      this.themeOrder.push(model.themeId);
    }
  }

  public getThemeModel(id: string): ThemeModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed theme: ID must be a non-empty string.');
      return undefined;
    }
    const model = this.themeRegistry.get(id);
    return model ? JSON.parse(JSON.stringify(model)) : undefined;
  }

  public getThemeModels(): ThemeModel[] {
    return this.themeOrder
      .map(id => this.themeRegistry.get(id))
      .filter((m): m is ThemeModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateThemeModel(id: string, updates: Partial<ThemeModel>): void {
    const existing = this.themeRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing theme: Model "${id}" not found.`);
      return;
    }
    const merged: ThemeModel = {
      ...existing,
      ...updates,
      themeId: existing.themeId,
    };
    this.registerThemeModel(merged);
  }

  public removeThemeModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed theme: ID must be a non-empty string.');
      return;
    }
    this.themeRegistry.delete(id);
    this.themeOrder = this.themeOrder.filter(existing => existing !== id);
  }

  public clearThemeModels(): void {
    this.themeRegistry.clear();
    this.themeOrder = [];
  }

  public getThemeModelKeys(): string[] {
    return [...this.themeOrder];
  }

  public hasThemeModel(id: string): boolean {
    return this.themeRegistry.has(id);
  }

  // ─── Color Palette Model CRUD ───
  public registerColorPaletteModel(palette: ColorPaletteModel): void {
    if (!this.validateColorPaletteModel(palette)) return;
    if (this.colorPaletteRegistry.has(palette.paletteId)) {
      console.warn(`[Runtime Diagnostics] duplicate color palette IDs: ID "${palette.paletteId}" already exists.`);
    }
    this.colorPaletteRegistry.set(palette.paletteId, JSON.parse(JSON.stringify(palette)));
    if (!this.colorPaletteOrder.includes(palette.paletteId)) {
      this.colorPaletteOrder.push(palette.paletteId);
    }
  }

  public getColorPaletteModel(id: string): ColorPaletteModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed color palette: ID must be a non-empty string.');
      return undefined;
    }
    const palette = this.colorPaletteRegistry.get(id);
    return palette ? JSON.parse(JSON.stringify(palette)) : undefined;
  }

  public getColorPaletteModels(): ColorPaletteModel[] {
    return this.colorPaletteOrder
      .map(id => this.colorPaletteRegistry.get(id))
      .filter((m): m is ColorPaletteModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateColorPaletteModel(id: string, updates: Partial<ColorPaletteModel>): void {
    const existing = this.colorPaletteRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing color palette: Model "${id}" not found.`);
      return;
    }
    const merged: ColorPaletteModel = {
      ...existing,
      ...updates,
      paletteId: existing.paletteId,
    };
    this.registerColorPaletteModel(merged);
  }

  public removeColorPaletteModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed color palette: ID must be a non-empty string.');
      return;
    }
    this.colorPaletteRegistry.delete(id);
    this.colorPaletteOrder = this.colorPaletteOrder.filter(existing => existing !== id);
  }

  public clearColorPaletteModels(): void {
    this.colorPaletteRegistry.clear();
    this.colorPaletteOrder = [];
  }

  public getColorPaletteModelKeys(): string[] {
    return [...this.colorPaletteOrder];
  }

  public hasColorPaletteModel(id: string): boolean {
    return this.colorPaletteRegistry.has(id);
  }

  // ─── Component Style Model CRUD ───
  public registerComponentStyleModel(style: ComponentStyleModel): void {
    if (!this.validateComponentStyleModel(style)) return;
    if (this.componentStyleRegistry.has(style.styleId)) {
      console.warn(`[Runtime Diagnostics] duplicate component style IDs: ID "${style.styleId}" already exists.`);
    }
    this.componentStyleRegistry.set(style.styleId, JSON.parse(JSON.stringify(style)));
    if (!this.componentStyleOrder.includes(style.styleId)) {
      this.componentStyleOrder.push(style.styleId);
    }
  }

  public getComponentStyleModel(id: string): ComponentStyleModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed component style: ID must be a non-empty string.');
      return undefined;
    }
    const style = this.componentStyleRegistry.get(id);
    return style ? JSON.parse(JSON.stringify(style)) : undefined;
  }

  public getComponentStyleModels(): ComponentStyleModel[] {
    return this.componentStyleOrder
      .map(id => this.componentStyleRegistry.get(id))
      .filter((m): m is ComponentStyleModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateComponentStyleModel(id: string, updates: Partial<ComponentStyleModel>): void {
    const existing = this.componentStyleRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing component style: Model "${id}" not found.`);
      return;
    }
    const merged: ComponentStyleModel = {
      ...existing,
      ...updates,
      styleId: existing.styleId,
    };
    this.registerComponentStyleModel(merged);
  }

  public removeComponentStyleModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed component style: ID must be a non-empty string.');
      return;
    }
    this.componentStyleRegistry.delete(id);
    this.componentStyleOrder = this.componentStyleOrder.filter(existing => existing !== id);
  }

  public clearComponentStyleModels(): void {
    this.componentStyleRegistry.clear();
    this.componentStyleOrder = [];
  }

  public getComponentStyleModelKeys(): string[] {
    return [...this.componentStyleOrder];
  }

  public hasComponentStyleModel(id: string): boolean {
    return this.componentStyleRegistry.has(id);
  }

  // ─── Workspace Style Model CRUD ───
  public registerWorkspaceStyleModel(ws: WorkspaceStyleModel): void {
    if (!this.validateWorkspaceStyleModel(ws)) return;
    if (this.workspaceStyleRegistry.has(ws.workspaceStyleId)) {
      console.warn(`[Runtime Diagnostics] duplicate workspace style IDs: ID "${ws.workspaceStyleId}" already exists.`);
    }
    this.workspaceStyleRegistry.set(ws.workspaceStyleId, JSON.parse(JSON.stringify(ws)));
    if (!this.workspaceStyleOrder.includes(ws.workspaceStyleId)) {
      this.workspaceStyleOrder.push(ws.workspaceStyleId);
    }
  }

  public getWorkspaceStyleModel(id: string): WorkspaceStyleModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed workspace style: ID must be a non-empty string.');
      return undefined;
    }
    const ws = this.workspaceStyleRegistry.get(id);
    return ws ? JSON.parse(JSON.stringify(ws)) : undefined;
  }

  public getWorkspaceStyleModels(): WorkspaceStyleModel[] {
    return this.workspaceStyleOrder
      .map(id => this.workspaceStyleRegistry.get(id))
      .filter((m): m is WorkspaceStyleModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateWorkspaceStyleModel(id: string, updates: Partial<WorkspaceStyleModel>): void {
    const existing = this.workspaceStyleRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing workspace style: Model "${id}" not found.`);
      return;
    }
    const merged: WorkspaceStyleModel = {
      ...existing,
      ...updates,
      workspaceStyleId: existing.workspaceStyleId,
    };
    this.registerWorkspaceStyleModel(merged);
  }

  public removeWorkspaceStyleModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed workspace style: ID must be a non-empty string.');
      return;
    }
    this.workspaceStyleRegistry.delete(id);
    this.workspaceStyleOrder = this.workspaceStyleOrder.filter(existing => existing !== id);
  }

  public clearWorkspaceStyleModels(): void {
    this.workspaceStyleRegistry.clear();
    this.workspaceStyleOrder = [];
  }

  public getWorkspaceStyleModelKeys(): string[] {
    return [...this.workspaceStyleOrder];
  }

  public hasWorkspaceStyleModel(id: string): boolean {
    return this.workspaceStyleRegistry.has(id);
  }

  // ─── Animation Playback Model CRUD ───
  public registerAnimationPlaybackModel(model: AnimationPlaybackModel): void {
    if (!this.validateAnimationPlaybackModel(model)) return;
    if (this.animationPlaybackRegistry.has(model.playbackId)) {
      console.warn(`[Runtime Diagnostics] duplicate animation playback IDs: ID "${model.playbackId}" already exists.`);
    }
    this.animationPlaybackRegistry.set(model.playbackId, JSON.parse(JSON.stringify(model)));
    if (!this.animationPlaybackOrder.includes(model.playbackId)) {
      this.animationPlaybackOrder.push(model.playbackId);
    }
  }

  public getAnimationPlaybackModel(id: string): AnimationPlaybackModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed animation playback: ID must be a non-empty string.');
      return undefined;
    }
    const model = this.animationPlaybackRegistry.get(id);
    return model ? JSON.parse(JSON.stringify(model)) : undefined;
  }

  public getAnimationPlaybackModels(): AnimationPlaybackModel[] {
    return this.animationPlaybackOrder
      .map(id => this.animationPlaybackRegistry.get(id))
      .filter((m): m is AnimationPlaybackModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateAnimationPlaybackModel(id: string, updates: Partial<AnimationPlaybackModel>): void {
    const existing = this.animationPlaybackRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing animation playback: Model "${id}" not found.`);
      return;
    }
    const merged: AnimationPlaybackModel = {
      ...existing,
      ...updates,
      playbackId: existing.playbackId,
    };
    this.registerAnimationPlaybackModel(merged);
  }

  public removeAnimationPlaybackModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed animation playback: ID must be a non-empty string.');
      return;
    }
    this.animationPlaybackRegistry.delete(id);
    this.animationPlaybackOrder = this.animationPlaybackOrder.filter(existing => existing !== id);
  }

  public clearAnimationPlaybackModels(): void {
    this.animationPlaybackRegistry.clear();
    this.animationPlaybackOrder = [];
  }

  public getAnimationPlaybackModelKeys(): string[] {
    return [...this.animationPlaybackOrder];
  }

  public hasAnimationPlaybackModel(id: string): boolean {
    return this.animationPlaybackRegistry.has(id);
  }

  // ─── Timeline Model CRUD ───
  public registerTimelineModel(model: TimelineModel): void {
    if (!this.validateTimelineModel(model)) return;
    if (this.timelineRegistry.has(model.timelineId)) {
      console.warn(`[Runtime Diagnostics] duplicate timeline IDs: ID "${model.timelineId}" already exists.`);
    }
    this.timelineRegistry.set(model.timelineId, JSON.parse(JSON.stringify(model)));
    if (!this.timelineOrder.includes(model.timelineId)) {
      this.timelineOrder.push(model.timelineId);
    }
  }

  public getTimelineModel(id: string): TimelineModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed timeline: ID must be a non-empty string.');
      return undefined;
    }
    const model = this.timelineRegistry.get(id);
    return model ? JSON.parse(JSON.stringify(model)) : undefined;
  }

  public getTimelineModels(): TimelineModel[] {
    return this.timelineOrder
      .map(id => this.timelineRegistry.get(id))
      .filter((m): m is TimelineModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateTimelineModel(id: string, updates: Partial<TimelineModel>): void {
    const existing = this.timelineRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing timeline: Model "${id}" not found.`);
      return;
    }
    const merged: TimelineModel = {
      ...existing,
      ...updates,
      timelineId: existing.timelineId,
    };
    this.registerTimelineModel(merged);
  }

  public removeTimelineModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed timeline: ID must be a non-empty string.');
      return;
    }
    this.timelineRegistry.delete(id);
    this.timelineOrder = this.timelineOrder.filter(existing => existing !== id);
  }

  public clearTimelineModels(): void {
    this.timelineRegistry.clear();
    this.timelineOrder = [];
  }

  public getTimelineModelKeys(): string[] {
    return [...this.timelineOrder];
  }

  public hasTimelineModel(id: string): boolean {
    return this.timelineRegistry.has(id);
  }

  // ─── Keyframe Model CRUD ───
  public registerKeyframeModel(model: KeyframeModel): void {
    if (!this.validateKeyframeModel(model)) return;
    if (this.keyframeRegistry.has(model.keyframeId)) {
      console.warn(`[Runtime Diagnostics] duplicate keyframe IDs: ID "${model.keyframeId}" already exists.`);
    }
    this.keyframeRegistry.set(model.keyframeId, JSON.parse(JSON.stringify(model)));
    if (!this.keyframeOrder.includes(model.keyframeId)) {
      this.keyframeOrder.push(model.keyframeId);
    }
  }

  public getKeyframeModel(id: string): KeyframeModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed keyframe: ID must be a non-empty string.');
      return undefined;
    }
    const model = this.keyframeRegistry.get(id);
    return model ? JSON.parse(JSON.stringify(model)) : undefined;
  }

  public getKeyframeModels(): KeyframeModel[] {
    return this.keyframeOrder
      .map(id => this.keyframeRegistry.get(id))
      .filter((m): m is KeyframeModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateKeyframeModel(id: string, updates: Partial<KeyframeModel>): void {
    const existing = this.keyframeRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing keyframe: Model "${id}" not found.`);
      return;
    }
    const merged: KeyframeModel = {
      ...existing,
      ...updates,
      keyframeId: existing.keyframeId,
    };
    this.registerKeyframeModel(merged);
  }

  public removeKeyframeModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed keyframe: ID must be a non-empty string.');
      return;
    }
    this.keyframeRegistry.delete(id);
    this.keyframeOrder = this.keyframeOrder.filter(existing => existing !== id);
  }

  public clearKeyframeModels(): void {
    this.keyframeRegistry.clear();
    this.keyframeOrder = [];
  }

  public getKeyframeModelKeys(): string[] {
    return [...this.keyframeOrder];
  }

  public hasKeyframeModel(id: string): boolean {
    return this.keyframeRegistry.has(id);
  }

  // ─── Playback Group Model CRUD ───
  public registerPlaybackGroupModel(model: PlaybackGroupModel): void {
    if (!this.validatePlaybackGroupModel(model)) return;
    if (this.playbackGroupRegistry.has(model.groupId)) {
      console.warn(`[Runtime Diagnostics] duplicate playback group IDs: ID "${model.groupId}" already exists.`);
    }
    this.playbackGroupRegistry.set(model.groupId, JSON.parse(JSON.stringify(model)));
    if (!this.playbackGroupOrder.includes(model.groupId)) {
      this.playbackGroupOrder.push(model.groupId);
    }
  }

  public getPlaybackGroupModel(id: string): PlaybackGroupModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed playback group: ID must be a non-empty string.');
      return undefined;
    }
    const model = this.playbackGroupRegistry.get(id);
    return model ? JSON.parse(JSON.stringify(model)) : undefined;
  }

  public getPlaybackGroupModels(): PlaybackGroupModel[] {
    return this.playbackGroupOrder
      .map(id => this.playbackGroupRegistry.get(id))
      .filter((m): m is PlaybackGroupModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updatePlaybackGroupModel(id: string, updates: Partial<PlaybackGroupModel>): void {
    const existing = this.playbackGroupRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing playback group: Model "${id}" not found.`);
      return;
    }
    const merged: PlaybackGroupModel = {
      ...existing,
      ...updates,
      groupId: existing.groupId,
    };
    this.registerPlaybackGroupModel(merged);
  }

  public removePlaybackGroupModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed playback group: ID must be a non-empty string.');
      return;
    }
    this.playbackGroupRegistry.delete(id);
    this.playbackGroupOrder = this.playbackGroupOrder.filter(existing => existing !== id);
  }

  public clearPlaybackGroupModels(): void {
    this.playbackGroupRegistry.clear();
    this.playbackGroupOrder = [];
  }

  public getPlaybackGroupModelKeys(): string[] {
    return [...this.playbackGroupOrder];
  }

  public hasPlaybackGroupModel(id: string): boolean {
    return this.playbackGroupRegistry.has(id);
  }

  // ─── Render Runtime Model CRUD ───
  public registerRenderRuntimeModel(model: RenderRuntimeModel): void {
    if (!this.validateRenderRuntimeModel(model)) return;
    if (this.renderRuntimeRegistry.has(model.runtimeId)) {
      console.warn(`[Runtime Diagnostics] duplicate render runtime IDs: ID "${model.runtimeId}" already exists.`);
    }
    this.renderRuntimeRegistry.set(model.runtimeId, JSON.parse(JSON.stringify(model)));
    if (!this.renderRuntimeOrder.includes(model.runtimeId)) {
      this.renderRuntimeOrder.push(model.runtimeId);
    }
  }

  public getRenderRuntimeModel(id: string): RenderRuntimeModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed render runtime: ID must be a non-empty string.');
      return undefined;
    }
    const model = this.renderRuntimeRegistry.get(id);
    return model ? JSON.parse(JSON.stringify(model)) : undefined;
  }

  public getRenderRuntimeModels(): RenderRuntimeModel[] {
    return this.renderRuntimeOrder
      .map(id => this.renderRuntimeRegistry.get(id))
      .filter((m): m is RenderRuntimeModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateRenderRuntimeModel(id: string, updates: Partial<RenderRuntimeModel>): void {
    const existing = this.renderRuntimeRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing render runtime: Model "${id}" not found.`);
      return;
    }
    const merged: RenderRuntimeModel = {
      ...existing,
      ...updates,
      runtimeId: existing.runtimeId,
    };
    this.registerRenderRuntimeModel(merged);
  }

  public removeRenderRuntimeModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed render runtime: ID must be a non-empty string.');
      return;
    }
    this.renderRuntimeRegistry.delete(id);
    this.renderRuntimeOrder = this.renderRuntimeOrder.filter(existing => existing !== id);
  }

  public clearRenderRuntimeModels(): void {
    this.renderRuntimeRegistry.clear();
    this.renderRuntimeOrder = [];
  }

  public getRenderRuntimeModelKeys(): string[] {
    return [...this.renderRuntimeOrder];
  }

  public hasRenderRuntimeModel(id: string): boolean {
    return this.renderRuntimeRegistry.has(id);
  }

  // ─── Render Pass Model CRUD ───
  public registerRenderPassModel(model: RenderPassModel): void {
    if (!this.validateRenderPassModel(model)) return;
    if (this.renderPassRegistry.has(model.renderPassId)) {
      console.warn(`[Runtime Diagnostics] duplicate render pass IDs: ID "${model.renderPassId}" already exists.`);
    }
    this.renderPassRegistry.set(model.renderPassId, JSON.parse(JSON.stringify(model)));
    if (!this.renderPassOrder.includes(model.renderPassId)) {
      this.renderPassOrder.push(model.renderPassId);
    }
  }

  public getRenderPassModel(id: string): RenderPassModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed render pass: ID must be a non-empty string.');
      return undefined;
    }
    const model = this.renderPassRegistry.get(id);
    return model ? JSON.parse(JSON.stringify(model)) : undefined;
  }

  public getRenderPassModels(): RenderPassModel[] {
    return this.renderPassOrder
      .map(id => this.renderPassRegistry.get(id))
      .filter((m): m is RenderPassModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateRenderPassModel(id: string, updates: Partial<RenderPassModel>): void {
    const existing = this.renderPassRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing render pass: Model "${id}" not found.`);
      return;
    }
    const merged: RenderPassModel = {
      ...existing,
      ...updates,
      renderPassId: existing.renderPassId,
    };
    this.registerRenderPassModel(merged);
  }

  public removeRenderPassModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed render pass: ID must be a non-empty string.');
      return;
    }
    this.renderPassRegistry.delete(id);
    this.renderPassOrder = this.renderPassOrder.filter(existing => existing !== id);
  }

  public clearRenderPassModels(): void {
    this.renderPassRegistry.clear();
    this.renderPassOrder = [];
  }

  public getRenderPassModelKeys(): string[] {
    return [...this.renderPassOrder];
  }

  public hasRenderPassModel(id: string): boolean {
    return this.renderPassRegistry.has(id);
  }

  // ─── Render Layer Runtime Model CRUD ───
  public registerRenderLayerRuntimeModel(model: RenderLayerRuntimeModel): void {
    if (!this.validateRenderLayerRuntimeModel(model)) return;
    if (this.renderLayerRegistry.has(model.layerRuntimeId)) {
      console.warn(`[Runtime Diagnostics] duplicate render layer runtime IDs: ID "${model.layerRuntimeId}" already exists.`);
    }
    this.renderLayerRegistry.set(model.layerRuntimeId, JSON.parse(JSON.stringify(model)));
    if (!this.renderLayerOrder.includes(model.layerRuntimeId)) {
      this.renderLayerOrder.push(model.layerRuntimeId);
    }
  }

  public getRenderLayerRuntimeModel(id: string): RenderLayerRuntimeModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed render layer runtime: ID must be a non-empty string.');
      return undefined;
    }
    const model = this.renderLayerRegistry.get(id);
    return model ? JSON.parse(JSON.stringify(model)) : undefined;
  }

  public getRenderLayerRuntimeModels(): RenderLayerRuntimeModel[] {
    return this.renderLayerOrder
      .map(id => this.renderLayerRegistry.get(id))
      .filter((m): m is RenderLayerRuntimeModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateRenderLayerRuntimeModel(id: string, updates: Partial<RenderLayerRuntimeModel>): void {
    const existing = this.renderLayerRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing render layer runtime: Model "${id}" not found.`);
      return;
    }
    const merged: RenderLayerRuntimeModel = {
      ...existing,
      ...updates,
      layerRuntimeId: existing.layerRuntimeId,
    };
    this.registerRenderLayerRuntimeModel(merged);
  }

  public removeRenderLayerRuntimeModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed render layer runtime: ID must be a non-empty string.');
      return;
    }
    this.renderLayerRegistry.delete(id);
    this.renderLayerOrder = this.renderLayerOrder.filter(existing => existing !== id);
  }

  public clearRenderLayerRuntimeModels(): void {
    this.renderLayerRegistry.clear();
    this.renderLayerOrder = [];
  }

  public getRenderLayerRuntimeModelKeys(): string[] {
    return [...this.renderLayerOrder];
  }

  public hasRenderLayerRuntimeModel(id: string): boolean {
    return this.renderLayerRegistry.has(id);
  }

  // ─── Render Queue Model CRUD ───
  public registerRenderQueueModel(model: RenderQueueModel): void {
    if (!this.validateRenderQueueModel(model)) return;
    if (this.renderQueueRegistry.has(model.queueId)) {
      console.warn(`[Runtime Diagnostics] duplicate render queue IDs: ID "${model.queueId}" already exists.`);
    }
    this.renderQueueRegistry.set(model.queueId, JSON.parse(JSON.stringify(model)));
    if (!this.renderQueueOrder.includes(model.queueId)) {
      this.renderQueueOrder.push(model.queueId);
    }
  }

  public getRenderQueueModel(id: string): RenderQueueModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed render queue: ID must be a non-empty string.');
      return undefined;
    }
    const model = this.renderQueueRegistry.get(id);
    return model ? JSON.parse(JSON.stringify(model)) : undefined;
  }

  public getRenderQueueModels(): RenderQueueModel[] {
    return this.renderQueueOrder
      .map(id => this.renderQueueRegistry.get(id))
      .filter((m): m is RenderQueueModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateRenderQueueModel(id: string, updates: Partial<RenderQueueModel>): void {
    const existing = this.renderQueueRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing render queue: Model "${id}" not found.`);
      return;
    }
    const merged: RenderQueueModel = {
      ...existing,
      ...updates,
      queueId: existing.queueId,
    };
    this.registerRenderQueueModel(merged);
  }

  public removeRenderQueueModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed render queue: ID must be a non-empty string.');
      return;
    }
    this.renderQueueRegistry.delete(id);
    this.renderQueueOrder = this.renderQueueOrder.filter(existing => existing !== id);
  }

  public clearRenderQueueModels(): void {
    this.renderQueueRegistry.clear();
    this.renderQueueOrder = [];
  }

  public getRenderQueueModelKeys(): string[] {
    return [...this.renderQueueOrder];
  }

  public hasRenderQueueModel(id: string): boolean {
    return this.renderQueueRegistry.has(id);
  }

  // ─── Frame Metadata Model CRUD ───
  public registerFrameMetadataModel(model: FrameMetadataModel): void {
    if (!this.validateFrameMetadataModel(model)) return;
    if (this.frameRegistry.has(model.frameId)) {
      console.warn(`[Runtime Diagnostics] duplicate frame IDs: ID "${model.frameId}" already exists.`);
    }
    this.frameRegistry.set(model.frameId, JSON.parse(JSON.stringify(model)));
    if (!this.frameOrder.includes(model.frameId)) {
      this.frameOrder.push(model.frameId);
    }
  }

  public getFrameMetadataModel(id: string): FrameMetadataModel | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed frame metadata: ID must be a non-empty string.');
      return undefined;
    }
    const model = this.frameRegistry.get(id);
    return model ? JSON.parse(JSON.stringify(model)) : undefined;
  }

  public getFrameMetadataModels(): FrameMetadataModel[] {
    return this.frameOrder
      .map(id => this.frameRegistry.get(id))
      .filter((m): m is FrameMetadataModel => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  public updateFrameMetadataModel(id: string, updates: Partial<FrameMetadataModel>): void {
    const existing = this.frameRegistry.get(id);
    if (!existing) {
      console.warn(`[Runtime Diagnostics] missing frame metadata: Model "${id}" not found.`);
      return;
    }
    const merged: FrameMetadataModel = {
      ...existing,
      ...updates,
      frameId: existing.frameId,
    };
    this.registerFrameMetadataModel(merged);
  }

  public removeFrameMetadataModel(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed frame metadata: ID must be a non-empty string.');
      return;
    }
    this.frameRegistry.delete(id);
    this.frameOrder = this.frameOrder.filter(existing => existing !== id);
  }

  public clearFrameMetadataModels(): void {
    this.frameRegistry.clear();
    this.frameOrder = [];
  }

  public getFrameMetadataModelKeys(): string[] {
    return [...this.frameOrder];
  }

  public hasFrameMetadataModel(id: string): boolean {
    return this.frameRegistry.has(id);
  }


  public reset(): void {
    this.clearBoardRenderModels();
    this.clearBoardBoundsModels();
    this.clearBoardConnectorModels();
    this.clearBoardRegionModels();
    this.clearSignalEffectModels();
    this.clearSignalPropagationModels();
    this.clearSignalColorModels();
    this.clearSignalActivityModels();
    this.clearThemeModels();
    this.clearColorPaletteModels();
    this.clearComponentStyleModels();
    this.clearWorkspaceStyleModels();
    this.clearAnimationPlaybackModels();
    this.clearTimelineModels();
    this.clearKeyframeModels();
    this.clearPlaybackGroupModels();
    this.clearRenderRuntimeModels();
    this.clearRenderPassModels();
    this.clearRenderLayerRuntimeModels();
    this.clearRenderQueueModels();
    this.clearFrameMetadataModels();
  }

  public destroy(): void {
    this.reset();
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

    // Reset Phase 10A STEMVerse visual simulator metadata
    this.clearSTEMVerseVisualStates();
    this.stemverseVisualTheme = { themeId: 'stemverse-default', mode: 'LIGHT', classroomMode: false, highContrast: false, metadata: {} };

    // Reset Phase 10B component visual model registry
    this.clearComponentVisualModels();

    // Reset Phase 10C wire visual registry
    this.clearWireVisualRegistry();

    // Reset Phase 10D board visual registry
    this.clearBoardVisualRegistry();

    // Reset Phase 10E signal visual registry
    this.clearSignalVisualRegistry();

    // Reset Phase 10F animation registry
    this.clearAnimationRegistry();

    // Reset Phase 11B interaction registry
    this.clearInteractionRegistry();

    // Reset Phase 11C breadboard workspace
    this.breadboardWorkspace.clear();

    // Reset Phase 12A canvas rendering foundation registries
    this.clearRenderNodes();
    this.clearSceneGraphs();
    this.clearViewportModels();
    this.clearRenderPipelines();

    // Reset Phase 12B component rendering foundation registries
    this.clearComponentRenderModels();
    this.clearComponentBoundsModels();
    this.clearComponentLabelModels();
    this.clearComponentPinRenderModels();

    // Reset Phase 12C wire rendering foundation registries
    this.clearWireRenderModels();
    this.clearWirePathModels();
    this.clearWireSegmentModels();
    this.clearWireAnchorModels();

    // Reset Phase 12D board rendering foundation registries
    this.clearBoardRenderModels();
    this.clearBoardBoundsModels();
    this.clearBoardConnectorModels();
    this.clearBoardRegionModels();

    // Reset Phase 13A signal effects foundation registries
    this.clearSignalEffectModels();
    this.clearSignalPropagationModels();
    this.clearSignalColorModels();
    this.clearSignalActivityModels();

    // Reset Phase 13B visual themes foundation registries
    this.clearThemeModels();
    this.clearColorPaletteModels();
    this.clearComponentStyleModels();
    this.clearWorkspaceStyleModels();

    // Reset Phase 13C animation playback foundation registries
    this.clearAnimationPlaybackModels();
    this.clearTimelineModels();
    this.clearKeyframeModels();
    this.clearPlaybackGroupModels();

    // Reset Phase 14A visual rendering runtime foundation registries
    this.clearRenderRuntimeModels();
    this.clearRenderPassModels();
    this.clearRenderLayerRuntimeModels();
    this.clearRenderQueueModels();
    this.clearFrameMetadataModels();

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

    this.clearSTEMVerseVisualStates();
    this.stemverseVisualTheme = { themeId: 'stemverse-default', mode: 'LIGHT', classroomMode: false, highContrast: false, metadata: {} };

    // Reset Phase 10B component visual model registry
    this.clearComponentVisualModels();

    // Reset Phase 10C wire visual registry
    this.clearWireVisualRegistry();

    // Reset Phase 10D board visual registry
    this.clearBoardVisualRegistry();

    // Reset Phase 10E signal visual registry
    this.clearSignalVisualRegistry();

    // Reset Phase 10F animation registry
    this.clearAnimationRegistry();

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

    // Reset Phase 11C breadboard workspace
    this.breadboardWorkspace.clear();

    // Reset Phase 12A canvas rendering foundation registries
    this.clearRenderNodes();
    this.clearSceneGraphs();
    this.clearViewportModels();
    this.clearRenderPipelines();

    // Reset Phase 12B component rendering foundation registries
    this.clearComponentRenderModels();
    this.clearComponentBoundsModels();
    this.clearComponentLabelModels();
    this.clearComponentPinRenderModels();

    // Reset Phase 12C wire rendering foundation registries
    this.clearWireRenderModels();
    this.clearWirePathModels();
    this.clearWireSegmentModels();
    this.clearWireAnchorModels();

    // Reset Phase 12D board rendering foundation registries
    this.clearBoardRenderModels();
    this.clearBoardBoundsModels();
    this.clearBoardConnectorModels();
    this.clearBoardRegionModels();

    // Reset Phase 13A signal effects foundation registries
    this.clearSignalEffectModels();
    this.clearSignalPropagationModels();
    this.clearSignalColorModels();
    this.clearSignalActivityModels();

    // Reset Phase 13B visual themes foundation registries
    this.clearThemeModels();
    this.clearColorPaletteModels();
    this.clearComponentStyleModels();
    this.clearWorkspaceStyleModels();

    // Reset Phase 13C animation playback foundation registries
    this.clearAnimationPlaybackModels();
    this.clearTimelineModels();
    this.clearKeyframeModels();
    this.clearPlaybackGroupModels();

    // Reset Phase 14A visual rendering runtime foundation registries
    this.clearRenderRuntimeModels();
    this.clearRenderPassModels();
    this.clearRenderLayerRuntimeModels();
    this.clearRenderQueueModels();
    this.clearFrameMetadataModels();

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
      if (this.stemverseVisualRegistry.size > 0) {
        stageSnap.stemverseVisualStates = this.getSTEMVerseVisualStates();
      }
      stageSnap.stemverseVisualTheme = this.getSTEMVerseVisualTheme();
      // Phase 10B: Attach component visual model metadata to stage snapshot entry
      if (this.componentVisualModelRegistry.size > 0) {
        stageSnap.componentVisualModels = this.getComponentVisualModels();
      }
      // Phase 10C: Attach wire visualization registry metadata to stage snapshot entry
      if (this.wireVisualRegistry.size > 0) {
        stageSnap.wireVisualRegistry = this.getWireVisualEntries();
      }
      // Phase 10D: Attach board visualization registry metadata to stage snapshot entry
      if (this.boardVisualRegistry.size > 0) {
        stageSnap.boardVisualRegistry = this.getBoardVisualEntries();
      }
      // Phase 10E: Attach signal visualization registry metadata to stage snapshot entry
      if (this.signalVisualRegistry.size > 0) {
        stageSnap.signalVisualRegistry = this.getSignalVisualEntries();
      }
      // Phase 10F: Attach animation registry metadata to stage snapshot entry
      if (this.animationRegistry.size > 0) {
        stageSnap.animationRegistry = this.getAnimationEntries();
      }
      // Phase 11B: Attach interaction metadata to stage snapshot entry
      if (this.interactionRegistry.size > 0) {
        stageSnap.interactionMetadata = this.getInteractionEntries();
      }
      // Phase 11C: Attach breadboard workspace metadata to stage snapshot entry
      if (this.breadboardWorkspace.modelCount > 0 || this.breadboardWorkspace.positionCount > 0 || this.breadboardWorkspace.placementCount > 0 || this.breadboardWorkspace.connectionCount > 0) {
        const bwState = this.breadboardWorkspace.toJSON();
        if (bwState.breadboardModels.length > 0) stageSnap.breadboardModels = bwState.breadboardModels;
        if (bwState.breadboardPositions.length > 0) stageSnap.breadboardPositions = bwState.breadboardPositions;
        if (bwState.componentPlacements.length > 0) stageSnap.componentPlacements = bwState.componentPlacements;
        if (bwState.connectionMetadata.length > 0) stageSnap.breadboardConnectionMetadata = bwState.connectionMetadata;
      }
      // Phase 12A: Attach canvas rendering foundation metadata to stage snapshot entry
      if (this.renderNodeRegistry.size > 0) {
        stageSnap.renderNodes = this.getRenderNodes();
      }
      if (this.sceneGraphRegistry.size > 0) {
        stageSnap.sceneGraphs = this.getSceneGraphs();
      }
      if (this.viewportModelRegistry.size > 0) {
        stageSnap.viewports = this.getViewportModels();
      }
      if (this.pipelineRegistry.size > 0) {
        stageSnap.renderPipelines = this.getRenderPipelines();
      }
      // Phase 12B: Attach component rendering foundation metadata to stage snapshot entry
      if (this.componentRenderRegistry.size > 0) {
        stageSnap.componentRenderModels = this.getComponentRenderModels();
      }
      if (this.componentBoundsRegistry.size > 0) {
        stageSnap.componentBoundsModels = this.getComponentBoundsModels();
      }
      if (this.componentLabelRegistry.size > 0) {
        stageSnap.componentLabelModels = this.getComponentLabelModels();
      }
      if (this.componentPinRenderRegistry.size > 0) {
        stageSnap.componentPinRenderModels = this.getComponentPinRenderModels();
      }

      // Phase 12C: Attach wire rendering foundation metadata to stage snapshot entry
      if (this.wireRenderRegistry.size > 0) {
        stageSnap.wireRenderModels = this.getWireRenderModels();
      }
      if (this.wirePathRegistry.size > 0) {
        stageSnap.wirePathModels = this.getWirePathModels();
      }
      if (this.wireSegmentRegistry.size > 0) {
        stageSnap.wireSegmentModels = this.getWireSegmentModels();
      }
      if (this.wireAnchorRegistry.size > 0) {
        stageSnap.wireAnchorModels = this.getWireAnchorModels();
      }

      // Phase 12D: Attach board rendering foundation metadata to stage snapshot entry
      if (this.boardRenderRegistry.size > 0) {
        stageSnap.boardRenderModels = this.getBoardRenderModels();
      }
      if (this.boardBoundsRegistry.size > 0) {
        stageSnap.boardBoundsModels = this.getBoardBoundsModels();
      }
      if (this.boardConnectorRegistry.size > 0) {
        stageSnap.boardConnectorModels = this.getBoardConnectorModels();
      }
      if (this.boardRegionRegistry.size > 0) {
        stageSnap.boardRegionModels = this.getBoardRegionModels();
      }

      // Phase 13A: Attach signal effects foundation metadata to stage snapshot entry
      if (this.signalEffectRegistry.size > 0) {
        stageSnap.signalEffectModels = this.getSignalEffectModels();
      }
      if (this.signalPropagationRegistry.size > 0) {
        stageSnap.signalPropagationModels = this.getSignalPropagationModels();
      }
      if (this.signalColorRegistry.size > 0) {
        stageSnap.signalColorModels = this.getSignalColorModels();
      }
      if (this.signalActivityRegistry.size > 0) {
        stageSnap.signalActivityModels = this.getSignalActivityModels();
      }
      // Phase 13B: Attach visual themes foundation metadata to stage snapshot entry
      if (this.themeRegistry.size > 0) {
        stageSnap.themeModels = this.getThemeModels();
      }
      if (this.colorPaletteRegistry.size > 0) {
        stageSnap.colorPaletteModels = this.getColorPaletteModels();
      }
      if (this.componentStyleRegistry.size > 0) {
        stageSnap.componentStyleModels = this.getComponentStyleModels();
      }
      if (this.workspaceStyleRegistry.size > 0) {
        stageSnap.workspaceStyleModels = this.getWorkspaceStyleModels();
      }

      // Phase 13C: Attach animation playback foundation metadata to stage snapshot entry
      if (this.animationPlaybackRegistry.size > 0) {
        stageSnap.animationPlaybacks = this.getAnimationPlaybackModels();
      }
      if (this.timelineRegistry.size > 0) {
        stageSnap.timelines = this.getTimelineModels();
      }
      if (this.keyframeRegistry.size > 0) {
        stageSnap.keyframes = this.getKeyframeModels();
      }
      if (this.playbackGroupRegistry.size > 0) {
        stageSnap.playbackGroups = this.getPlaybackGroupModels();
      }

      // Phase 14A: Attach visual rendering runtime foundation metadata to stage snapshot entry
      if (this.renderRuntimeRegistry.size > 0) {
        stageSnap.renderRuntimes = this.getRenderRuntimeModels();
      }
      if (this.renderPassRegistry.size > 0) {
        stageSnap.renderPasses = this.getRenderPassModels();
      }
      if (this.renderLayerRegistry.size > 0) {
        stageSnap.renderLayers = this.getRenderLayerRuntimeModels();
      }
      if (this.renderQueueRegistry.size > 0) {
        stageSnap.renderQueues = this.getRenderQueueModels();
      }
      if (this.frameRegistry.size > 0) {
        stageSnap.frames = this.getFrameMetadataModels();
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

      // Phase 10A: Serialize STEMVerse visual simulator metadata
      if (isStage && this.stemverseVisualRegistry.size > 0) {
        serializedTarget.stemverseVisualStates = this.getSTEMVerseVisualStates();
      }
      if (isStage) {
        serializedTarget.stemverseVisualTheme = this.getSTEMVerseVisualTheme();
      }

      // Phase 10B: Serialize component visual model metadata
      if (isStage && this.componentVisualModelRegistry.size > 0) {
        serializedTarget.componentVisualModels = this.getComponentVisualModels();
      }

      // Phase 10C: Serialize wire visualization registry metadata
      if (isStage && this.wireVisualRegistry.size > 0) {
        serializedTarget.wireVisualRegistry = this.getWireVisualEntries();
      }

      // Phase 10D: Serialize board visualization registry metadata
      if (isStage && this.boardVisualRegistry.size > 0) {
        serializedTarget.boardVisualRegistry = this.getBoardVisualEntries();
      }

      // Phase 10E: Serialize signal visualization registry metadata
      if (isStage && this.signalVisualRegistry.size > 0) {
        serializedTarget.signalVisualRegistry = this.getSignalVisualEntries();
      }

      // Phase 10F: Serialize animation registry metadata
      if (isStage && this.animationRegistry.size > 0) {
        serializedTarget.animationRegistry = this.getAnimationEntries();
      }

      // Phase 11B: Serialize interaction registry metadata
      if (isStage && this.interactionRegistry.size > 0) {
        serializedTarget.interactionMetadata = this.getInteractionEntries();
      }

      // Phase 11C: Serialize breadboard workspace metadata
      if (isStage && (this.breadboardWorkspace.modelCount > 0 || this.breadboardWorkspace.positionCount > 0 || this.breadboardWorkspace.placementCount > 0 || this.breadboardWorkspace.connectionCount > 0)) {
        const bwState = this.breadboardWorkspace.toJSON();
        if (bwState.breadboardModels.length > 0) serializedTarget.breadboardModels = bwState.breadboardModels;
        if (bwState.breadboardPositions.length > 0) serializedTarget.breadboardPositions = bwState.breadboardPositions;
        if (bwState.componentPlacements.length > 0) serializedTarget.componentPlacements = bwState.componentPlacements;
        if (bwState.connectionMetadata.length > 0) serializedTarget.breadboardConnectionMetadata = bwState.connectionMetadata;
      }

      // Phase 12A: Serialize canvas rendering foundation metadata
      if (isStage && this.renderNodeRegistry.size > 0) {
        serializedTarget.renderNodes = this.getRenderNodes();
      }
      if (isStage && this.sceneGraphRegistry.size > 0) {
        serializedTarget.sceneGraphs = this.getSceneGraphs();
      }
      if (isStage && this.viewportModelRegistry.size > 0) {
        serializedTarget.viewports = this.getViewportModels();
      }
      if (isStage && this.pipelineRegistry.size > 0) {
        serializedTarget.renderPipelines = this.getRenderPipelines();
      }

      // Phase 12B: Serialize component rendering foundation metadata
      if (isStage && this.componentRenderRegistry.size > 0) {
        serializedTarget.componentRenderModels = this.getComponentRenderModels();
      }
      if (isStage && this.componentBoundsRegistry.size > 0) {
        serializedTarget.componentBoundsModels = this.getComponentBoundsModels();
      }
      if (isStage && this.componentLabelRegistry.size > 0) {
        serializedTarget.componentLabelModels = this.getComponentLabelModels();
      }
      if (isStage && this.componentPinRenderRegistry.size > 0) {
        serializedTarget.componentPinRenderModels = this.getComponentPinRenderModels();
      }

      // Phase 12C: Serialize wire rendering foundation metadata
      if (isStage && this.wireRenderRegistry.size > 0) {
        serializedTarget.wireRenderModels = this.getWireRenderModels();
      }
      if (isStage && this.wirePathRegistry.size > 0) {
        serializedTarget.wirePathModels = this.getWirePathModels();
      }
      if (isStage && this.wireSegmentRegistry.size > 0) {
        serializedTarget.wireSegmentModels = this.getWireSegmentModels();
      }
      if (isStage && this.wireAnchorRegistry.size > 0) {
        serializedTarget.wireAnchorModels = this.getWireAnchorModels();
      }

      // Phase 12D: Serialize board rendering foundation metadata
      if (isStage && this.boardRenderRegistry.size > 0) {
        serializedTarget.boardRenderModels = this.getBoardRenderModels();
      }
      if (isStage && this.boardBoundsRegistry.size > 0) {
        serializedTarget.boardBoundsModels = this.getBoardBoundsModels();
      }
      if (isStage && this.boardConnectorRegistry.size > 0) {
        serializedTarget.boardConnectorModels = this.getBoardConnectorModels();
      }
      if (isStage && this.boardRegionRegistry.size > 0) {
        serializedTarget.boardRegionModels = this.getBoardRegionModels();
      }

      // Phase 13A: Serialize signal effects foundation metadata
      if (isStage && this.signalEffectRegistry.size > 0) {
        serializedTarget.signalEffectModels = this.getSignalEffectModels();
      }
      if (isStage && this.signalPropagationRegistry.size > 0) {
        serializedTarget.signalPropagationModels = this.getSignalPropagationModels();
      }
      if (isStage && this.signalColorRegistry.size > 0) {
        serializedTarget.signalColorModels = this.getSignalColorModels();
      }
      if (isStage && this.signalActivityRegistry.size > 0) {
        serializedTarget.signalActivityModels = this.getSignalActivityModels();
      }

      // Phase 13B: Serialize visual themes foundation metadata
      if (isStage && this.themeRegistry.size > 0) {
        serializedTarget.themeModels = this.getThemeModels();
      }
      if (isStage && this.colorPaletteRegistry.size > 0) {
        serializedTarget.colorPaletteModels = this.getColorPaletteModels();
      }
      if (isStage && this.componentStyleRegistry.size > 0) {
        serializedTarget.componentStyleModels = this.getComponentStyleModels();
      }
      if (isStage && this.workspaceStyleRegistry.size > 0) {
        serializedTarget.workspaceStyleModels = this.getWorkspaceStyleModels();
      }

      // Phase 13C: Serialize animation playback foundation metadata
      if (isStage && this.animationPlaybackRegistry.size > 0) {
        serializedTarget.animationPlaybacks = this.getAnimationPlaybackModels();
      }
      if (isStage && this.timelineRegistry.size > 0) {
        serializedTarget.timelines = this.getTimelineModels();
      }
      if (isStage && this.keyframeRegistry.size > 0) {
        serializedTarget.keyframes = this.getKeyframeModels();
      }
      if (isStage && this.playbackGroupRegistry.size > 0) {
        serializedTarget.playbackGroups = this.getPlaybackGroupModels();
      }

      // Phase 14A: Serialize visual rendering runtime foundation metadata
      if (isStage && this.renderRuntimeRegistry.size > 0) {
        serializedTarget.renderRuntimes = this.getRenderRuntimeModels();
      }
      if (isStage && this.renderPassRegistry.size > 0) {
        serializedTarget.renderPasses = this.getRenderPassModels();
      }
      if (isStage && this.renderLayerRegistry.size > 0) {
        serializedTarget.renderLayers = this.getRenderLayerRuntimeModels();
      }
      if (isStage && this.renderQueueRegistry.size > 0) {
        serializedTarget.renderQueues = this.getRenderQueueModels();
      }
      if (isStage && this.frameRegistry.size > 0) {
        serializedTarget.frames = this.getFrameMetadataModels();
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
      // Phase 10A: Restore STEMVerse visual simulator metadata from stage target
      if (Array.isArray(stageTarget.stemverseVisualStates)) {
        for (const visualState of stageTarget.stemverseVisualStates) {
          this.registerSTEMVerseVisualState(JSON.parse(JSON.stringify(visualState)));
        }
      }
      if (stageTarget.stemverseVisualTheme) {
        this.setSTEMVerseVisualTheme(JSON.parse(JSON.stringify(stageTarget.stemverseVisualTheme)));
      }
      // Phase 10B: Restore component visual model metadata from stage target
      if (Array.isArray(stageTarget.componentVisualModels)) {
        for (const visualModel of stageTarget.componentVisualModels) {
          this.registerComponentVisualModel(JSON.parse(JSON.stringify(visualModel)));
        }
      }
      // Phase 10C: Restore wire visualization registry metadata from stage target
      if (Array.isArray(stageTarget.wireVisualRegistry)) {
        for (const entry of stageTarget.wireVisualRegistry) {
          this.registerWireVisualEntry(JSON.parse(JSON.stringify(entry)));
        }
      }
      // Phase 10D: Restore board visualization registry metadata from stage target
      if (Array.isArray(stageTarget.boardVisualRegistry)) {
        for (const entry of stageTarget.boardVisualRegistry) {
          this.registerBoardVisualEntry(JSON.parse(JSON.stringify(entry)));
        }
      }
      // Phase 10E: Restore signal visualization registry metadata from stage target
      if (Array.isArray(stageTarget.signalVisualRegistry)) {
        for (const entry of stageTarget.signalVisualRegistry) {
          this.registerSignalVisualEntry(JSON.parse(JSON.stringify(entry)));
        }
      }
      // Phase 10F: Restore animation registry metadata from stage target
      if (Array.isArray(stageTarget.animationRegistry)) {
        for (const entry of stageTarget.animationRegistry) {
          this.registerAnimationEntry(JSON.parse(JSON.stringify(entry)));
        }
      }
      // Phase 11B: Restore interaction registry metadata from stage target
      if (Array.isArray(stageTarget.interactionMetadata)) {
        for (const entry of stageTarget.interactionMetadata) {
          this.registerInteractionEntry(JSON.parse(JSON.stringify(entry)));
        }
      }
      // Phase 11C: Restore breadboard workspace metadata from stage target
      if (Array.isArray(stageTarget.breadboardModels) ||
          Array.isArray(stageTarget.breadboardPositions) ||
          Array.isArray(stageTarget.componentPlacements) ||
          Array.isArray(stageTarget.breadboardConnectionMetadata)) {
        this.breadboardWorkspace.fromJSON({
          breadboardModels: Array.isArray(stageTarget.breadboardModels)
            ? stageTarget.breadboardModels.map(m => JSON.parse(JSON.stringify(m))) : undefined,
          breadboardPositions: Array.isArray(stageTarget.breadboardPositions)
            ? stageTarget.breadboardPositions.map(p => JSON.parse(JSON.stringify(p))) : undefined,
          componentPlacements: Array.isArray(stageTarget.componentPlacements)
            ? stageTarget.componentPlacements.map(c => JSON.parse(JSON.stringify(c))) : undefined,
          connectionMetadata: Array.isArray(stageTarget.breadboardConnectionMetadata)
            ? stageTarget.breadboardConnectionMetadata.map(c => JSON.parse(JSON.stringify(c))) : undefined,
        });
      }
      // Phase 12A: Restore canvas rendering foundation metadata from stage target
      if (Array.isArray(stageTarget.renderNodes)) {
        for (const node of stageTarget.renderNodes) {
          this.registerRenderNode(JSON.parse(JSON.stringify(node)));
        }
      }
      if (Array.isArray(stageTarget.sceneGraphs)) {
        for (const graph of stageTarget.sceneGraphs) {
          this.registerSceneGraph(JSON.parse(JSON.stringify(graph)));
        }
      }
      if (Array.isArray(stageTarget.viewports)) {
        for (const vp of stageTarget.viewports) {
          this.registerViewportModel(JSON.parse(JSON.stringify(vp)));
        }
      }
      if (Array.isArray(stageTarget.renderPipelines)) {
        for (const pipe of stageTarget.renderPipelines) {
          this.registerRenderPipeline(JSON.parse(JSON.stringify(pipe)));
        }
      }
      // Phase 12B: Restore component rendering foundation metadata from stage target
      if (Array.isArray(stageTarget.componentRenderModels)) {
        for (const model of stageTarget.componentRenderModels) {
          this.registerComponentRenderModel(JSON.parse(JSON.stringify(model)));
        }
      }
      if (Array.isArray(stageTarget.componentBoundsModels)) {
        for (const bounds of stageTarget.componentBoundsModels) {
          this.registerComponentBoundsModel(JSON.parse(JSON.stringify(bounds)));
        }
      }
      if (Array.isArray(stageTarget.componentLabelModels)) {
        for (const label of stageTarget.componentLabelModels) {
          this.registerComponentLabelModel(JSON.parse(JSON.stringify(label)));
        }
      }
      if (Array.isArray(stageTarget.componentPinRenderModels)) {
        for (const pin of stageTarget.componentPinRenderModels) {
          this.registerComponentPinRenderModel(JSON.parse(JSON.stringify(pin)));
        }
      }

      // Phase 12C: Restore wire rendering foundation metadata from stage target
      if (Array.isArray(stageTarget.wireRenderModels)) {
        for (const model of stageTarget.wireRenderModels) {
          this.registerWireRenderModel(JSON.parse(JSON.stringify(model)));
        }
      }
      if (Array.isArray(stageTarget.wirePathModels)) {
        for (const path of stageTarget.wirePathModels) {
          this.registerWirePathModel(JSON.parse(JSON.stringify(path)));
        }
      }
      if (Array.isArray(stageTarget.wireSegmentModels)) {
        for (const segment of stageTarget.wireSegmentModels) {
          this.registerWireSegmentModel(JSON.parse(JSON.stringify(segment)));
        }
      }
      if (Array.isArray(stageTarget.wireAnchorModels)) {
        for (const anchor of stageTarget.wireAnchorModels) {
          this.registerWireAnchorModel(JSON.parse(JSON.stringify(anchor)));
        }
      }

      // Phase 12D: Restore board rendering foundation metadata from stage target
      if (Array.isArray(stageTarget.boardRenderModels)) {
        for (const model of stageTarget.boardRenderModels) {
          this.registerBoardRenderModel(JSON.parse(JSON.stringify(model)));
        }
      }
      if (Array.isArray(stageTarget.boardBoundsModels)) {
        for (const bounds of stageTarget.boardBoundsModels) {
          this.registerBoardBoundsModel(JSON.parse(JSON.stringify(bounds)));
        }
      }
      if (Array.isArray(stageTarget.boardConnectorModels)) {
        for (const connector of stageTarget.boardConnectorModels) {
          this.registerBoardConnectorModel(JSON.parse(JSON.stringify(connector)));
        }
      }
      if (Array.isArray(stageTarget.boardRegionModels)) {
        for (const region of stageTarget.boardRegionModels) {
          this.registerBoardRegionModel(JSON.parse(JSON.stringify(region)));
        }
      }

      // Phase 13A: Restore signal effects foundation metadata from stage target
      if (Array.isArray(stageTarget.signalEffectModels)) {
        for (const model of stageTarget.signalEffectModels) {
          this.registerSignalEffectModel(JSON.parse(JSON.stringify(model)));
        }
      }
      if (Array.isArray(stageTarget.signalPropagationModels)) {
        for (const prop of stageTarget.signalPropagationModels) {
          this.registerSignalPropagationModel(JSON.parse(JSON.stringify(prop)));
        }
      }
      if (Array.isArray(stageTarget.signalColorModels)) {
        for (const color of stageTarget.signalColorModels) {
          this.registerSignalColorModel(JSON.parse(JSON.stringify(color)));
        }
      }
      if (Array.isArray(stageTarget.signalActivityModels)) {
        for (const act of stageTarget.signalActivityModels) {
          this.registerSignalActivityModel(JSON.parse(JSON.stringify(act)));
        }
      }

      // Phase 13B: Restore visual themes foundation metadata from stage target
      if (Array.isArray(stageTarget.themeModels)) {
        for (const model of stageTarget.themeModels) {
          this.registerThemeModel(JSON.parse(JSON.stringify(model)));
        }
      }
      if (Array.isArray(stageTarget.colorPaletteModels)) {
        for (const palette of stageTarget.colorPaletteModels) {
          this.registerColorPaletteModel(JSON.parse(JSON.stringify(palette)));
        }
      }
      if (Array.isArray(stageTarget.componentStyleModels)) {
        for (const style of stageTarget.componentStyleModels) {
          this.registerComponentStyleModel(JSON.parse(JSON.stringify(style)));
        }
      }
      if (Array.isArray(stageTarget.workspaceStyleModels)) {
        for (const ws of stageTarget.workspaceStyleModels) {
          this.registerWorkspaceStyleModel(JSON.parse(JSON.stringify(ws)));
        }
      }

      // Phase 13C: Restore animation playback foundation metadata from stage target
      if (Array.isArray(stageTarget.animationPlaybacks)) {
        for (const model of stageTarget.animationPlaybacks) {
          this.registerAnimationPlaybackModel(JSON.parse(JSON.stringify(model)));
        }
      }
      if (Array.isArray(stageTarget.timelines)) {
        for (const model of stageTarget.timelines) {
          this.registerTimelineModel(JSON.parse(JSON.stringify(model)));
        }
      }
      if (Array.isArray(stageTarget.keyframes)) {
        for (const model of stageTarget.keyframes) {
          this.registerKeyframeModel(JSON.parse(JSON.stringify(model)));
        }
      }
      if (Array.isArray(stageTarget.playbackGroups)) {
        for (const model of stageTarget.playbackGroups) {
          this.registerPlaybackGroupModel(JSON.parse(JSON.stringify(model)));
        }
      }

      // Phase 14A: Restore visual rendering runtime foundation metadata from stage target
      if (Array.isArray(stageTarget.renderRuntimes)) {
        for (const model of stageTarget.renderRuntimes) {
          this.registerRenderRuntimeModel(JSON.parse(JSON.stringify(model)));
        }
      }
      if (Array.isArray(stageTarget.renderPasses)) {
        for (const model of stageTarget.renderPasses) {
          this.registerRenderPassModel(JSON.parse(JSON.stringify(model)));
        }
      }
      if (Array.isArray(stageTarget.renderLayers)) {
        for (const model of stageTarget.renderLayers) {
          this.registerRenderLayerRuntimeModel(JSON.parse(JSON.stringify(model)));
        }
      }
      if (Array.isArray(stageTarget.renderQueues)) {
        for (const model of stageTarget.renderQueues) {
          this.registerRenderQueueModel(JSON.parse(JSON.stringify(model)));
        }
      }
      if (Array.isArray(stageTarget.frames)) {
        for (const model of stageTarget.frames) {
          this.registerFrameMetadataModel(JSON.parse(JSON.stringify(model)));
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
