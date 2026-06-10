import { ASTBlock, ASTScript, BlockId, Thread, TargetState, SpriteState, ActiveSoundTrigger, PenCommand, PenState, ListState, GlideState } from '../types';
import { IASTInterpreter } from './index';

export const MAX_BLOCKS_PER_TICK = 1000;
export const MAX_STACK_DEPTH = 256;

export const STAGE_MIN_X = -240;
export const STAGE_MAX_X = 240;
export const STAGE_MIN_Y = -180;
export const STAGE_MAX_Y = 180;

/**
 * Result of executing a single AST block node.
 * Keeps return values serializable and deterministic.
 */
export interface BlockExecutionResult {
  /** ID of the next block to execute, or null if chain ended. */
  nextBlockId: BlockId | null;
  /** Whether this block mutated target state. */
  didMutate: boolean;
  /** Optional return value from reporter blocks. */
  returnValue?: string | number | boolean;
}

/**
 * Minimal hardware adapter for stub execution of hardware opcodes.
 * No real hardware — just captures calls for testing and future integration.
 */
export interface IHardwareAdapter {
  digitalWrite(pin: number, value: number): void;
  digitalRead(pin: number): number;
  analogRead(pin: number): number;
  analogWrite(pin: number, value: number): void;
}

/**
 * Stub hardware adapter that records calls and returns deterministic defaults.
 */
export class StubHardwareAdapter implements IHardwareAdapter {
  public callLog: Array<{ method: string; args: number[] }> = [];
  private pinStates: Map<number, number> = new Map();

  digitalWrite(pin: number, value: number): void {
    this.callLog.push({ method: 'digitalWrite', args: [pin, value] });
    this.pinStates.set(pin, value);
  }

  digitalRead(pin: number): number {
    this.callLog.push({ method: 'digitalRead', args: [pin] });
    return this.pinStates.get(pin) ?? 0;
  }

  analogRead(pin: number): number {
    this.callLog.push({ method: 'analogRead', args: [pin] });
    return this.pinStates.get(pin) ?? 0;
  }

  analogWrite(pin: number, value: number): void {
    this.callLog.push({ method: 'analogWrite', args: [pin, value] });
    this.pinStates.set(pin, value);
  }

  reset(): void {
    this.callLog = [];
    this.pinStates.clear();
  }
}

/**
 * Minimal concrete AST interpreter.
 * Refactored to utilize a clean Opcode Dispatch Table and try-catch boundaries for Error Isolation.
 */
export class MinimalASTInterpreter implements IASTInterpreter {
  private targets: Map<string, TargetState> = new Map();
  private hardwareAdapter: IHardwareAdapter;
  private blockRegistries: Map<string, Map<BlockId, ASTBlock>> = new Map();

  public onStopAll?: () => void;
  public onStopOtherScripts?: (currentThread: Thread) => void;
  public onCreateClone?: (sourceTargetId: string) => void;
  public onDeleteClone?: (targetId: string) => void;
  public onBroadcast?: (
    broadcastName: string,
    options?: {
      wait?: boolean;
      sourceThreadId?: string;
      sourceTargetId?: string;
      generation?: number;
    }
  ) => void;
  public onLayerOperation?: (
    targetId: string,
    type: 'front' | 'back' | 'forward' | 'backward',
    layersCount?: number
  ) => void;
  public onSoundTrigger?: (
    targetId: string,
    soundNameOrId: string,
    loop: boolean
  ) => { triggerId: string; durationMs: number } | undefined;
  public onStopAllSounds?: () => void;
  public onPenCommand?: (command: PenCommand) => void;
  public onVariableChanged?: (
    variableId: string,
    targetId: string | undefined,
    value: unknown
  ) => void;
  public onListChanged?: (
    listId: string,
    targetId: string | undefined,
    value: unknown[]
  ) => void;
  public onRandomRequest?: () => number;
  public onResetTimer?: () => void;
  public onGetTimerMs?: () => number;
  public onGetMouseState?: () => { x: number; y: number; isDown: boolean };
  public onGetKeyboardState?: () => { pressedKeys: string[] };
  public onIsTouchingEdge?: (targetId: string) => boolean;
  public onIsTouchingObject?: (targetId: string, objectName: string) => boolean;
  public onAskQuestion?: (thread: Thread, question: string) => void;
  public onGetAnswer?: () => string;

  public onSetPinState?: (componentId: string, pinId: string, high: boolean) => void;
  public onGetPinState?: (componentId: string, pinId: string) => boolean;
  public onSetServoAngle?: (componentId: string, angle: number) => void;
  public onGetUltrasonicDistance?: (componentId: string) => number;
  public onGetTemperature?: (componentId: string) => number;
  public onGetHumidity?: (componentId: string) => number;
  public onSetLCDText?: (componentId: string, text: string) => void;
  public onSetOLEDText?: (componentId: string, text: string) => void;
  public onSetBuzzerState?: (componentId: string, active: boolean) => void;

  constructor(hardwareAdapter?: IHardwareAdapter) {
    this.hardwareAdapter = hardwareAdapter ?? new StubHardwareAdapter();
  }

  /**
   * Register a target (sprite/stage) so its scripts and variables are accessible.
   * Populates a target-isolated O(1) block registry.
   */
  registerTarget(target: TargetState): void {
    this.targets.set(target.id, target);

    const registry = new Map<BlockId, ASTBlock>();
    if (target && target.scripts) {
      for (const script of target.scripts) {
        if (script && script.blocks) {
          for (const block of Object.values(script.blocks)) {
            if (block && block.id) {
              if (registry.has(block.id)) {
                console.warn(`[Runtime Engine] Duplicate block ID detected: "${block.id}" in target "${target.id}". Overwriting deterministically.`);
              }
              registry.set(block.id, block);
            } else {
              console.warn(`[Runtime Engine] Invalid script block entry detected in target "${target.id}":`, block);
            }
          }
        } else {
          console.warn(`[Runtime Engine] Malformed script or missing blocks list in target "${target.id}".`);
        }
      }
    }
    this.blockRegistries.set(target.id, registry);
  }

  /**
   * Unregister a target and clean its block registry.
   */
  unregisterTarget(targetId: string): void {
    this.targets.delete(targetId);
    this.blockRegistries.delete(targetId);
  }

  /**
   * Clears all registered targets and block registries.
   */
  clear(): void {
    this.targets.clear();
    this.blockRegistries.clear();
  }

  /**
   * Evaluate a full script synchronously. Walks the chain from topBlockId to end.
   */
  evaluateScript(thread: Thread, script: ASTScript): void {
    thread.status = 'RUNNING';
    thread.currentBlockId = script.topBlockId;
    while (thread.status === 'RUNNING') {
      this.stepThread(thread);
    }
  }

  /**
   * Sequential block chain traversal. Walks `next` pointers until null.
   */
  traverse(thread: Thread, startingBlockId: BlockId): void {
    thread.status = 'RUNNING';
    thread.currentBlockId = startingBlockId;
    let stepCount = 0;
    while (thread.status === 'RUNNING') {
      if (stepCount >= MAX_BLOCKS_PER_TICK) {
        thread.status = 'YIELDED';
        break;
      }
      this.stepThread(thread);
      stepCount++;
    }
  }

  /**
   * Steps a thread execution forward, executing up to MAX_BLOCKS_PER_TICK blocks
   * or until yielding/blocking/completion.
   */
  stepThread(thread: Thread): void {
    if (thread.status === 'DONE' || thread.isKilled) {
      if (thread.isKilled && thread.status !== 'DONE') {
        thread.status = 'DONE';
        thread.currentBlockId = null;
      }
      return;
    }

    const target = this.targets.get(thread.targetId);
    if (!target) {
      thread.status = 'DONE';
      thread.currentBlockId = null;
      return;
    }

    if (thread.currentBlockId === null && thread.status === 'RUNNING') {
      if (!thread.context.localScope['__started']) {
        thread.context.localScope['__started'] = true;
        thread.currentBlockId = thread.topBlockId;
      } else {
        thread.status = 'DONE';
        return;
      }
    } else {
      thread.context.localScope['__started'] = true;
    }

    let blocksExecuted = 0;

    while (thread.status === 'RUNNING' && thread.currentBlockId !== null) {
      if (thread.stack.length >= MAX_STACK_DEPTH) {
        console.warn(`[Runtime Engine] Max stack depth of ${MAX_STACK_DEPTH} exceeded.`);
        thread.status = 'DONE';
        thread.currentBlockId = null;
        break;
      }

      if (blocksExecuted >= MAX_BLOCKS_PER_TICK) {
        thread.status = 'YIELDED';
        break;
      }

      const block = this.findBlock(thread, thread.currentBlockId);
      if (!block) {
        if (thread.currentBlockId) {
          console.warn(`[Runtime Engine] Malformed block reference or missing block ID "${thread.currentBlockId}" in target "${thread.targetId}".`);
        }
        thread.status = 'DONE';
        thread.currentBlockId = null;
        break;
      }

      const result = this.executeBlock(thread, block, target);
      blocksExecuted++;

      if (thread.isKilled) {
        thread.status = 'DONE';
        thread.currentBlockId = null;
        break;
      }

      if (result.nextBlockId !== null) {
        thread.currentBlockId = result.nextBlockId;
      } else {
        if (thread.stack.length > 0) {
          const returnBlockId = thread.stack.pop()!;
          thread.currentBlockId = returnBlockId;
        } else {
          thread.currentBlockId = null;
          if (thread.status === 'RUNNING') {
            thread.status = 'DONE';
          }
        }
      }

      if (thread.yieldRequest) {
        thread.yieldRequest = false;
        thread.status = 'YIELDED';
        break;
      }
    }
  }

  findBlock(thread: Thread, blockId: BlockId): ASTBlock | undefined {
    const registry = this.blockRegistries.get(thread.targetId);
    if (!registry) {
      console.warn(`[Runtime Engine] Registry not found for target "${thread.targetId}". Cannot lookup block "${blockId}".`);
      return undefined;
    }
    return registry.get(blockId);
  }

  /**
   * Execute a single block node using a clean dispatch object registry.
   * Implements try-catch error boundaries for complete runtime error isolation.
   */
  executeBlock(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const opcode = block.opcode;
    try {
      const handler = this.statementHandlers[opcode];
      if (handler) {
        return handler(thread, block, target);
      }

      console.warn(`[Runtime Engine] Unknown statement opcode: "${opcode}" in target "${thread.targetId}". Skipping block.`);
      return { nextBlockId: block.next, didMutate: false };
    } catch (error: any) {
      console.warn(`[Runtime Engine] Error executing statement block "${block.id}" (opcode: "${opcode}") in target "${thread.targetId}": ${error?.message || error}`);
      
      // Safe deterministic failure semantics: mark thread DONE + isKilled, swept in next phase
      thread.status = 'DONE';
      thread.isKilled = true;
      thread.currentBlockId = null;

      return { nextBlockId: null, didMutate: false };
    }
  }

  // ─── Statement Opcode Handlers Dispatch Map ──────────────────────
  private statementHandlers: Record<string, (thread: Thread, block: ASTBlock, target: TargetState) => BlockExecutionResult> = {
    // Event statement handlers
    'event_whenflagclicked': (t, b, tg) => this.executeEventNode(t, b, tg),
    'event_whenbroadcastreceived': (t, b, tg) => this.executeEventNode(t, b, tg),
    'event_whencloned': (t, b, tg) => this.executeEventNode(t, b, tg),
    'event_broadcast': (t, b, tg) => this.executeEventBroadcast(t, b, tg),
    'event_broadcastandwait': (t, b, tg) => this.executeEventBroadcastAndWait(t, b, tg),

    // Control statement handlers
    'control_if': (t, b, tg) => this.executeControlIf(t, b, tg),
    'control_if_else': (t, b, tg) => this.executeControlIfElse(t, b, tg),
    'control_repeat': (t, b, tg) => this.executeControlRepeat(t, b, tg),
    'control_forever': (t, b, tg) => this.executeControlForever(t, b, tg),
    'control_until': (t, b, tg) => this.executeControlUntil(t, b, tg),
    'control_wait': (t, b, tg) => this.executeControlWait(t, b, tg),
    'control_stop': (t, b, tg) => this.executeControlStop(t, b, tg),
    'control_create_clone_of': (t, b, tg) => this.executeControlCreateCloneOf(t, b, tg),
    'control_delete_this_clone': (t, b, tg) => this.executeControlDeleteThisClone(t, b, tg),

    // Looks statement handlers (Phase 7A)
    'looks_show': (t, b, tg) => this.executeLooksShow(t, b, tg),
    'looks_hide': (t, b, tg) => this.executeLooksHide(t, b, tg),
    'looks_switchcostumeto': (t, b, tg) => this.executeLooksSwitchCostumeTo(t, b, tg),
    'looks_nextcostume': (t, b, tg) => this.executeLooksNextCostume(t, b, tg),
    'looks_gotofrontback': (t, b, tg) => this.executeLooksGotoFrontBack(t, b, tg),
    'looks_goforwardbackwardlayers': (t, b, tg) => this.executeLooksGoForwardBackwardLayers(t, b, tg),
    'looks_say': (t, b, tg) => this.executeLooksSay(t, b, tg),
    'looks_sayforsecs': (t, b, tg) => this.executeLooksSayForSecs(t, b, tg),
    'looks_think': (t, b, tg) => this.executeLooksThink(t, b, tg),
    'looks_thinkforsecs': (t, b, tg) => this.executeLooksThinkForSecs(t, b, tg),
    'looks_switchbackdropto': (t, b, tg) => this.executeLooksSwitchBackdropTo(t, b, tg),
    'looks_nextbackdrop': (t, b, tg) => this.executeLooksNextBackdrop(t, b, tg),

    // Motion statement handlers
    'motion_movesteps': (t, b, tg) => this.executeMotionMoveSteps(t, b, tg),
    'motion_gotoxy': (t, b, tg) => this.executeMotionGotoXY(t, b, tg),
    'motion_setx': (t, b, tg) => this.executeMotionSetX(t, b, tg),
    'motion_sety': (t, b, tg) => this.executeMotionSetY(t, b, tg),
    'motion_changexby': (t, b, tg) => this.executeMotionChangeXBy(t, b, tg),
    'motion_changeyby': (t, b, tg) => this.executeMotionChangeYBy(t, b, tg),
    'motion_turnright': (t, b, tg) => this.executeMotionTurnRight(t, b, tg),
    'motion_turnleft': (t, b, tg) => this.executeMotionTurnLeft(t, b, tg),
    'motion_pointindirection': (t, b, tg) => this.executeMotionPointInDirection(t, b, tg),
    'motion_glidesecstoxy': (t, b, tg) => this.executeMotionGlideSecsToXY(t, b, tg),
    'motion_ifonedgebounce': (t, b, tg) => this.executeMotionIfOnEdgeBounce(t, b, tg),

    // Variable statement handlers
    'data_setvariableto': (t, b, tg) => this.executeVariableSet(t, b, tg),
    'data_changevariableby': (t, b, tg) => this.executeVariableChange(t, b, tg),
    'data_addtolist': (t, b, tg) => this.executeListAdd(t, b, tg),
    'data_deleteoflist': (t, b, tg) => this.executeListDelete(t, b, tg),
    'data_deletealloflist': (t, b, tg) => this.executeListDeleteAll(t, b, tg),
    'data_insertatlist': (t, b, tg) => this.executeListInsert(t, b, tg),
    'data_replaceitemoflist': (t, b, tg) => this.executeListReplace(t, b, tg),

    // Hardware statement handlers
    'hardware_digitalwrite': (t, b) => this.executeHardwareDigitalWrite(t, b),
    'hardware_digitalread': (t, b) => this.executeHardwareDigitalRead(t, b),
    'hardware_analogread': (t, b) => this.executeHardwareAnalogRead(t, b),
    'hardware_analogwrite': (t, b) => this.executeHardwareAnalogWrite(t, b),

    // Audio statement handlers (Phase 7E)
    'sound_play': (t, b, tg) => this.executeSoundPlay(t, b, tg),
    'sound_playuntildone': (t, b, tg) => this.executeSoundPlayUntilDone(t, b, tg),
    'sound_stopallsounds': (t, b, tg) => this.executeSoundStopAllSounds(t, b, tg),
    'sound_changevolumeby': (t, b, tg) => this.executeSoundChangeVolumeBy(t, b, tg),
    'sound_setvolumeto': (t, b, tg) => this.executeSoundSetVolumeTo(t, b, tg),

    // Pen statement handlers (Phase 7F)
    'pen_penDown': (t, b, tg) => this.executePenPenDown(t, b, tg),
    'pen_penUp': (t, b, tg) => this.executePenPenUp(t, b, tg),
    'pen_clear': (t, b, tg) => this.executePenClear(t, b, tg),
    'pen_setPenColorToColor': (t, b, tg) => this.executePenSetColorToColor(t, b, tg),
    'pen_changePenSizeBy': (t, b, tg) => this.executePenChangeSizeBy(t, b, tg),
    'pen_setPenSizeTo': (t, b, tg) => this.executePenSetSizeTo(t, b, tg),

    // Sensing statement handlers (Phase 7J)
    'sensing_resettimer': (t, b, tg) => this.executeSensingResetTimer(t, b, tg),

    // Interaction statement handlers (Phase 7K)
    'sensing_askandwait': (t, b, tg) => this.executeSensingAskAndWait(t, b, tg),

    // Electronics statement handlers (Phase 7X)
    'electronics_setpinhigh': (t, b, tg) => this.executeElectronicsSetPinHigh(t, b, tg),
    'electronics_setpinlow': (t, b, tg) => this.executeElectronicsSetPinLow(t, b, tg),
    'electronics_setservoangle': (t, b, tg) => this.executeElectronicsSetServoAngle(t, b, tg),
    'electronics_setlcdtext': (t, b, tg) => this.executeElectronicsSetLCDText(t, b, tg),
    'electronics_setoledtext': (t, b, tg) => this.executeElectronicsSetOLEDText(t, b, tg),
    'electronics_buzzeron': (t, b, tg) => this.executeElectronicsBuzzerOn(t, b, tg),
    'electronics_buzzeroff': (t, b, tg) => this.executeElectronicsBuzzerOff(t, b, tg),
  };

  // ─── Event handlers ──────────────────────────────────────────────
  private executeEventNode(_thread: Thread, block: ASTBlock, _target: TargetState): BlockExecutionResult {
    return { nextBlockId: block.next, didMutate: false };
  }

  private executeEventBroadcast(thread: Thread, block: ASTBlock, _target: TargetState): BlockExecutionResult {
    const broadcastName = String(this.resolveInput(thread, block, 'BROADCAST_INPUT', '') || block.fields['BROADCAST_OPTION']?.value || '');

    if (this.onBroadcast) {
      this.onBroadcast(broadcastName, {
        wait: false,
        sourceThreadId: thread.id,
        sourceTargetId: thread.targetId
      });
    }

    return { nextBlockId: block.next, didMutate: true };
  }

  private executeEventBroadcastAndWait(thread: Thread, block: ASTBlock, _target: TargetState): BlockExecutionResult {
    const broadcastName = String(this.resolveInput(thread, block, 'BROADCAST_INPUT', '') || block.fields['BROADCAST_OPTION']?.value || '');

    if (this.onBroadcast) {
      this.onBroadcast(broadcastName, {
        wait: true,
        sourceThreadId: thread.id,
        sourceTargetId: thread.targetId
      });
    }

    return { nextBlockId: block.next, didMutate: true };
  }

  // ─── Control handlers ────────────────────────────────────────────
  private executeControlIf(thread: Thread, block: ASTBlock, _target: TargetState): BlockExecutionResult {
    const condition = this.resolveConditionValue(thread, block, 'CONDITION', false);
    if (condition) {
      const substackId = this.resolveSubstackId(block, 'SUBSTACK');
      if (substackId && this.findBlock(thread, substackId)) {
        if (block.next !== null) {
          thread.stack.push(block.next);
        }
        return { nextBlockId: substackId, didMutate: false };
      }
    }
    return { nextBlockId: block.next, didMutate: false };
  }

  private executeControlIfElse(thread: Thread, block: ASTBlock, _target: TargetState): BlockExecutionResult {
    const condition = this.resolveConditionValue(thread, block, 'CONDITION', false);
    if (condition) {
      const substackId = this.resolveSubstackId(block, 'SUBSTACK');
      if (substackId && this.findBlock(thread, substackId)) {
        if (block.next !== null) {
          thread.stack.push(block.next);
        }
        return { nextBlockId: substackId, didMutate: false };
      }
    } else {
      const substack2Id = this.resolveSubstackId(block, 'SUBSTACK2');
      if (substack2Id && this.findBlock(thread, substack2Id)) {
        if (block.next !== null) {
          thread.stack.push(block.next);
        }
        return { nextBlockId: substack2Id, didMutate: false };
      }
    }
    return { nextBlockId: block.next, didMutate: false };
  }

  private executeControlRepeat(thread: Thread, block: ASTBlock, _target: TargetState): BlockExecutionResult {
    const scopeKey = `loop_${block.id}_remaining`;

    if (thread.context.localScope[scopeKey] === undefined) {
      const times = Math.max(0, Math.round(this.resolveInputValue(thread, block, 'TIMES', 0)));
      thread.context.localScope[scopeKey] = times;

      if (times <= 0) {
        delete thread.context.localScope[scopeKey];
        return { nextBlockId: block.next, didMutate: false };
      }

      const substackId = this.resolveSubstackId(block, 'SUBSTACK');
      if (substackId && this.findBlock(thread, substackId)) {
        thread.stack.push(block.id);
        return { nextBlockId: substackId, didMutate: false };
      } else {
        delete thread.context.localScope[scopeKey];
        return { nextBlockId: block.next, didMutate: false };
      }
    } else {
      const remaining = (thread.context.localScope[scopeKey] as number) - 1;
      thread.context.localScope[scopeKey] = remaining;

      if (remaining > 0) {
        const substackId = this.resolveSubstackId(block, 'SUBSTACK');
        if (substackId && this.findBlock(thread, substackId)) {
          thread.stack.push(block.id);
          thread.yieldRequest = true;
          return { nextBlockId: substackId, didMutate: false };
        } else {
          delete thread.context.localScope[scopeKey];
          return { nextBlockId: block.next, didMutate: false };
        }
      } else {
        delete thread.context.localScope[scopeKey];
        return { nextBlockId: block.next, didMutate: false };
      }
    }
  }

  private executeControlForever(thread: Thread, block: ASTBlock, _target: TargetState): BlockExecutionResult {
    const scopeKey = `forever_${block.id}_entered`;
    const substackId = this.resolveSubstackId(block, 'SUBSTACK');

    if (thread.context.localScope[scopeKey] === undefined) {
      thread.context.localScope[scopeKey] = true;

      if (substackId) {
        const subBlock = this.findBlock(thread, substackId);
        if (subBlock) {
          thread.stack.push(block.id);
          return { nextBlockId: substackId, didMutate: false };
        } else {
          console.warn(`[Runtime Engine] Substack block "${substackId}" not found in target "${thread.targetId}".`);
        }
      }

      thread.yieldRequest = true;
      return { nextBlockId: block.id, didMutate: false };
    } else {
      thread.yieldRequest = true;

      if (substackId) {
        const subBlock = this.findBlock(thread, substackId);
        if (subBlock) {
          thread.stack.push(block.id);
          return { nextBlockId: substackId, didMutate: false };
        } else {
          console.warn(`[Runtime Engine] Substack block "${substackId}" not found in target "${thread.targetId}".`);
        }
      }

      return { nextBlockId: block.id, didMutate: false };
    }
  }

  private executeControlUntil(thread: Thread, block: ASTBlock, _target: TargetState): BlockExecutionResult {
    const condition = this.resolveConditionValue(thread, block, 'CONDITION', false);
    const scopeKey = `until_${block.id}_entered`;
    const substackId = this.resolveSubstackId(block, 'SUBSTACK');

    if (condition) {
      delete thread.context.localScope[scopeKey];
      return { nextBlockId: block.next, didMutate: false };
    }

    if (thread.context.localScope[scopeKey] === undefined) {
      thread.context.localScope[scopeKey] = true;

      if (substackId) {
        const subBlock = this.findBlock(thread, substackId);
        if (subBlock) {
          thread.stack.push(block.id);
          return { nextBlockId: substackId, didMutate: false };
        } else {
          console.warn(`[Runtime Engine] Substack block "${substackId}" not found in target "${thread.targetId}".`);
        }
      }

      thread.yieldRequest = true;
      return { nextBlockId: block.id, didMutate: false };
    } else {
      thread.yieldRequest = true;

      if (substackId) {
        const subBlock = this.findBlock(thread, substackId);
        if (subBlock) {
          thread.stack.push(block.id);
          return { nextBlockId: substackId, didMutate: false };
        } else {
          console.warn(`[Runtime Engine] Substack block "${substackId}" not found in target "${thread.targetId}".`);
        }
      }

      return { nextBlockId: block.id, didMutate: false };
    }
  }

  private executeControlWait(thread: Thread, block: ASTBlock, _target: TargetState): BlockExecutionResult {
    const durationSecs = this.resolveInputValue(thread, block, 'DURATION', 1);
    const durationMs = Math.max(0, durationSecs) * 1000;

    thread.status = 'WAITING';
    thread.delayMs = durationMs;
    return { nextBlockId: block.next, didMutate: false };
  }

  private executeControlStop(thread: Thread, block: ASTBlock, _target: TargetState): BlockExecutionResult {
    const option = block.fields['STOP_OPTION']?.value as string;
    if (option === 'all') {
      thread.status = 'DONE';
      thread.isKilled = true;
      thread.currentBlockId = null;

      if (this.onStopAll) {
        this.onStopAll();
      }
      return { nextBlockId: null, didMutate: false };
    } else if (option === 'other scripts in sprite') {
      if (this.onStopOtherScripts) {
        this.onStopOtherScripts(thread);
      }
      return { nextBlockId: block.next, didMutate: false };
    } else {
      thread.status = 'DONE';
      thread.isKilled = true;
      thread.currentBlockId = null;
      return { nextBlockId: null, didMutate: false };
    }
  }

  private executeControlCreateCloneOf(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const optionInput = block.inputs['CLONE_OPTION']?.value;
    let sourceId = typeof optionInput === 'string' ? optionInput : target.id;
    if (sourceId === '_myself') {
      sourceId = target.id;
    }

    if (this.onCreateClone) {
      this.onCreateClone(sourceId);
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeControlDeleteThisClone(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    if (this.onDeleteClone) {
      this.onDeleteClone(target.id);
    }

    thread.status = 'DONE';
    thread.isKilled = true;
    thread.currentBlockId = null;
    return { nextBlockId: null, didMutate: true };
  }

  // ─── Looks handlers (Phase 7A) ───────────────────────────────────
  private executeLooksShow(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    if (!target.isStage) {
      const sprite = target as SpriteState;
      sprite.visible = true;
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeLooksHide(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    if (!target.isStage) {
      const sprite = target as SpriteState;
      sprite.visible = false;
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeLooksSwitchCostumeTo(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const costumeInput = this.resolveInput(thread, block, 'COSTUME', undefined);
    if (costumeInput === undefined) {
      const fieldVal = block.fields['COSTUME']?.value;
      if (fieldVal !== undefined) {
        this.applySwitchCostume(target, fieldVal);
      }
    } else {
      this.applySwitchCostume(target, costumeInput);
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  private applySwitchCostume(target: TargetState, costumeVal: unknown): void {
    if (target.costumes.length === 0) return;

    if (typeof costumeVal === 'number') {
      const idx = Math.floor(costumeVal);
      if (idx >= 0 && idx < target.costumes.length) {
        target.currentCostumeIndex = idx;
      } else {
        console.warn(`[Runtime Diagnostics] Invalid costume index: ${idx} for target "${target.id}".`);
      }
    } else {
      const name = String(costumeVal);
      const parsedNum = parseFloat(name);
      if (!isNaN(parsedNum)) {
        const idx = Math.floor(parsedNum);
        if (idx >= 0 && idx < target.costumes.length) {
          target.currentCostumeIndex = idx;
          return;
        }
      }

      const idx = target.costumes.findIndex(c => c.name === name || c.id === name);
      if (idx !== -1) {
        target.currentCostumeIndex = idx;
      } else {
        console.warn(`[Runtime Diagnostics] Costume name or ID "${name}" not found in target "${target.id}".`);
      }
    }
  }

  private executeLooksNextCostume(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    if (target.costumes.length > 0) {
      target.currentCostumeIndex = (target.currentCostumeIndex + 1) % target.costumes.length;
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeLooksGotoFrontBack(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const frontBackField = block.fields['FRONT_BACK']?.value as string || 'front';
    const type = frontBackField === 'back' ? 'back' : 'front';

    if (this.onLayerOperation) {
      this.onLayerOperation(target.id, type);
    } else {
      console.warn(`[Runtime Diagnostics] onLayerOperation callback not registered. Skipping looks_gotofrontback.`);
    }

    return { nextBlockId: block.next, didMutate: true };
  }

  private executeLooksGoForwardBackwardLayers(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const forwardBackwardField = block.fields['FORWARD_BACKWARD']?.value as string || 'forward';
    const type = forwardBackwardField === 'backward' ? 'backward' : 'forward';
    const numLayers = Math.max(0, Math.round(this.resolveInputValue(thread, block, 'NUM', 1)));

    if (this.onLayerOperation) {
      this.onLayerOperation(target.id, type, numLayers);
    } else {
      console.warn(`[Runtime Diagnostics] onLayerOperation callback not registered. Skipping looks_goforwardbackwardlayers.`);
    }

    return { nextBlockId: block.next, didMutate: true };
  }

  private executeLooksSay(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const textVal = String(this.resolveInput(thread, block, 'MESSAGE', ''));
    if (textVal === '') {
      target.sayBubble = undefined;
    } else {
      target.sayBubble = { text: textVal };
      target.thinkBubble = undefined; // only one bubble active
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeLooksThink(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const textVal = String(this.resolveInput(thread, block, 'MESSAGE', ''));
    if (textVal === '') {
      target.thinkBubble = undefined;
    } else {
      target.thinkBubble = { text: textVal };
      target.sayBubble = undefined; // only one bubble active
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeLooksSayForSecs(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const textVal = String(this.resolveInput(thread, block, 'MESSAGE', ''));
    const duration = Math.max(0, this.resolveInputValue(thread, block, 'SECS', 2));

    if (textVal === '') {
      target.sayBubble = undefined;
      return { nextBlockId: block.next, didMutate: true };
    }

    target.sayBubble = {
      text: textVal,
      expiresAt: duration * 1000
    };
    target.thinkBubble = undefined;

    thread.status = 'WAITING';
    thread.delayMs = duration * 1000;

    return { nextBlockId: block.next, didMutate: true };
  }

  private executeLooksThinkForSecs(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const textVal = String(this.resolveInput(thread, block, 'MESSAGE', ''));
    const duration = Math.max(0, this.resolveInputValue(thread, block, 'SECS', 2));

    if (textVal === '') {
      target.thinkBubble = undefined;
      return { nextBlockId: block.next, didMutate: true };
    }

    target.thinkBubble = {
      text: textVal,
      expiresAt: duration * 1000
    };
    target.sayBubble = undefined;

    thread.status = 'WAITING';
    thread.delayMs = duration * 1000;

    return { nextBlockId: block.next, didMutate: true };
  }

  private executeLooksSwitchBackdropTo(thread: Thread, block: ASTBlock, _target: TargetState): BlockExecutionResult {
    const stage = Array.from(this.targets.values()).find(t => t.isStage) as any;
    if (!stage) {
      console.warn('[Runtime Diagnostics] Switch backdrop failed: Stage target not found.');
      return { nextBlockId: block.next, didMutate: false };
    }

    if (!stage.backdrops || stage.backdrops.length === 0) {
      return { nextBlockId: block.next, didMutate: false };
    }

    if (stage.currentBackdropIndex === undefined) {
      stage.currentBackdropIndex = 0;
    }

    const backdropInput = this.resolveInput(thread, block, 'BACKDROP', undefined);
    let val = backdropInput;
    if (val === undefined) {
      val = block.fields['BACKDROP']?.value;
    }

    if (val === undefined) {
      console.warn('[Runtime Diagnostics] Switch backdrop failed: Missing BACKDROP input or field.');
      return { nextBlockId: block.next, didMutate: false };
    }

    if (typeof val === 'number') {
      const idx = Math.floor(val);
      if (idx >= 0 && idx < stage.backdrops.length) {
        stage.currentBackdropIndex = idx;
      } else {
        console.warn(`[Runtime Diagnostics] invalid backdrop indexes: Backdrop index ${idx} is out of bounds.`);
      }
    } else {
      const name = String(val);
      const parsedNum = parseFloat(name);
      if (!isNaN(parsedNum)) {
        const idx = Math.floor(parsedNum);
        if (idx >= 0 && idx < stage.backdrops.length) {
          stage.currentBackdropIndex = idx;
          return { nextBlockId: block.next, didMutate: true };
        }
      }

      if (name === 'next backdrop') {
        stage.currentBackdropIndex = (stage.currentBackdropIndex + 1) % stage.backdrops.length;
      } else if (name === 'previous backdrop') {
        stage.currentBackdropIndex = (stage.currentBackdropIndex - 1 + stage.backdrops.length) % stage.backdrops.length;
      } else if (name === 'random backdrop') {
        if (!this.onRandomRequest) {
          console.warn('[Runtime Engine] Deterministic PRNG callback missing inside interpreter execution path. Falling back to deterministic 0.5.');
        }
        const rand = this.onRandomRequest ? this.onRandomRequest() : 0.5;
        stage.currentBackdropIndex = Math.floor(rand * stage.backdrops.length);
      } else {
        const idx = stage.backdrops.findIndex((b: any) => b.name === name || b.id === name);
        if (idx !== -1) {
          stage.currentBackdropIndex = idx;
        } else {
          console.warn(`[Runtime Diagnostics] Switch backdrop failed: Backdrop name/ID "${name}" not found.`);
        }
      }
    }

    return { nextBlockId: block.next, didMutate: true };
  }

  private executeLooksNextBackdrop(thread: Thread, block: ASTBlock, _target: TargetState): BlockExecutionResult {
    const stage = Array.from(this.targets.values()).find(t => t.isStage) as any;
    if (!stage) {
      console.warn('[Runtime Diagnostics] Next backdrop failed: Stage target not found.');
      return { nextBlockId: block.next, didMutate: false };
    }

    if (!stage.backdrops || stage.backdrops.length === 0) {
      return { nextBlockId: block.next, didMutate: false };
    }

    if (stage.currentBackdropIndex === undefined) {
      stage.currentBackdropIndex = 0;
    }

    stage.currentBackdropIndex = (stage.currentBackdropIndex + 1) % stage.backdrops.length;
    return { nextBlockId: block.next, didMutate: true };
  }

  // ─── Motion handlers ─────────────────────────────────────────────
  private executeMotionMoveSteps(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    if (target.isStage) return { nextBlockId: block.next, didMutate: false };
    const sprite = target as SpriteState;
    const oldX = sprite.x;
    const oldY = sprite.y;
    const steps = this.resolveInputValue(thread, block, 'STEPS', 10);
    if (!Number.isFinite(steps)) {
      console.warn(`[Runtime Diagnostics] Invalid motion_movesteps steps: steps=${steps} is not finite for target "${target.id}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    const radians = (90 - sprite.direction) * (Math.PI / 180);
    sprite.x += steps * Math.cos(radians);
    sprite.y += steps * Math.sin(radians);
    this.recordPenLine(target, oldX, oldY, sprite.x, sprite.y);
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeMotionGotoXY(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    if (target.isStage) return { nextBlockId: block.next, didMutate: false };
    const sprite = target as SpriteState;
    const oldX = sprite.x;
    const oldY = sprite.y;
    const newX = this.resolveInputValue(thread, block, 'X', 0);
    const newY = this.resolveInputValue(thread, block, 'Y', 0);
    if (!Number.isFinite(newX) || !Number.isFinite(newY)) {
      console.warn(`[Runtime Diagnostics] Invalid motion_gotoxy coordinates: x=${newX}, y=${newY} is not finite for target "${target.id}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    sprite.x = newX;
    sprite.y = newY;
    this.recordPenLine(target, oldX, oldY, sprite.x, sprite.y);
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeMotionSetX(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    if (target.isStage) return { nextBlockId: block.next, didMutate: false };
    const sprite = target as SpriteState;
    const oldX = sprite.x;
    const oldY = sprite.y;
    const newX = this.resolveInputValue(thread, block, 'X', 0);
    if (!Number.isFinite(newX)) {
      console.warn(`[Runtime Diagnostics] Invalid motion_setx coordinate: x=${newX} is not finite for target "${target.id}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    sprite.x = newX;
    this.recordPenLine(target, oldX, oldY, sprite.x, sprite.y);
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeMotionSetY(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    if (target.isStage) return { nextBlockId: block.next, didMutate: false };
    const sprite = target as SpriteState;
    const oldX = sprite.x;
    const oldY = sprite.y;
    const newY = this.resolveInputValue(thread, block, 'Y', 0);
    if (!Number.isFinite(newY)) {
      console.warn(`[Runtime Diagnostics] Invalid motion_sety coordinate: y=${newY} is not finite for target "${target.id}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    sprite.y = newY;
    this.recordPenLine(target, oldX, oldY, sprite.x, sprite.y);
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeMotionChangeXBy(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    if (target.isStage) return { nextBlockId: block.next, didMutate: false };
    const sprite = target as SpriteState;
    const oldX = sprite.x;
    const oldY = sprite.y;
    const dx = this.resolveInputValue(thread, block, 'DX', 0);
    if (!Number.isFinite(dx)) {
      console.warn(`[Runtime Diagnostics] Invalid motion_changexby delta: dx=${dx} is not finite for target "${target.id}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    sprite.x += dx;
    this.recordPenLine(target, oldX, oldY, sprite.x, sprite.y);
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeMotionChangeYBy(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    if (target.isStage) return { nextBlockId: block.next, didMutate: false };
    const sprite = target as SpriteState;
    const oldX = sprite.x;
    const oldY = sprite.y;
    const dy = this.resolveInputValue(thread, block, 'DY', 0);
    if (!Number.isFinite(dy)) {
      console.warn(`[Runtime Diagnostics] Invalid motion_changeyby delta: dy=${dy} is not finite for target "${target.id}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    sprite.y += dy;
    this.recordPenLine(target, oldX, oldY, sprite.x, sprite.y);
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeMotionTurnRight(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    if (target.isStage) return { nextBlockId: block.next, didMutate: false };
    const sprite = target as SpriteState;
    const degrees = this.resolveInputValue(thread, block, 'DEGREES', 15);
    if (!Number.isFinite(degrees)) {
      console.warn(`[Runtime Diagnostics] invalid direction inputs: Turn right degrees "${degrees}" is not finite for target "${target.id}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    sprite.direction = this.normalizeDirection(sprite.direction + degrees);
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeMotionTurnLeft(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    if (target.isStage) return { nextBlockId: block.next, didMutate: false };
    const sprite = target as SpriteState;
    const degrees = this.resolveInputValue(thread, block, 'DEGREES', 15);
    if (!Number.isFinite(degrees)) {
      console.warn(`[Runtime Diagnostics] invalid direction inputs: Turn left degrees "${degrees}" is not finite for target "${target.id}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    sprite.direction = this.normalizeDirection(sprite.direction - degrees);
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeMotionPointInDirection(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    if (target.isStage) return { nextBlockId: block.next, didMutate: false };
    const sprite = target as SpriteState;
    const direction = this.resolveInputValue(thread, block, 'DIRECTION', 90);
    if (!Number.isFinite(direction)) {
      console.warn(`[Runtime Diagnostics] invalid direction inputs: Point in direction "${direction}" is not finite for target "${target.id}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    sprite.direction = this.normalizeDirection(direction);
    return { nextBlockId: block.next, didMutate: true };
  }

  /**
   * Deterministic glide handler (Phase 7I).
   * Initializes a GlideState on the thread and transitions to WAITING.
   * Actual position interpolation happens in BaseRuntime.tick().
   */
  private executeMotionGlideSecsToXY(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    if (target.isStage) return { nextBlockId: block.next, didMutate: false };
    const sprite = target as SpriteState;

    const secs = this.resolveInputValue(thread, block, 'SECS', 1);
    const targetX = this.resolveInputValue(thread, block, 'X', 0);
    const targetY = this.resolveInputValue(thread, block, 'Y', 0);

    if (!Number.isFinite(secs) || !Number.isFinite(targetX) || !Number.isFinite(targetY)) {
      console.warn(`[Runtime Diagnostics] malformed motion blocks: Glide parameters are not finite numbers for target "${target.id}".`);
      return { nextBlockId: block.next, didMutate: false };
    }

    const durationMs = Math.max(0, secs) * 1000;

    if (durationMs <= 0) {
      // Zero-duration glide: snap directly to target
      sprite.x = targetX;
      sprite.y = targetY;
      return { nextBlockId: block.next, didMutate: true };
    }

    // Initialize glide state on thread
    thread.glideState = {
      startX: sprite.x,
      startY: sprite.y,
      targetX,
      targetY,
      durationMs,
      elapsedMs: 0,
    };

    // Transition thread to WAITING — glide lifecycle runs in tick()
    thread.status = 'WAITING';
    return { nextBlockId: block.next, didMutate: true };
  }

  /**
   * Deterministic edge bounce handler (Phase 7I).
   * Uses fixed stage bounds (-240..240 x, -180..180 y).
   * Inverts direction and clamps coordinates when sprite exceeds bounds.
   */
  private executeMotionIfOnEdgeBounce(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    if (target.isStage) return { nextBlockId: block.next, didMutate: false };
    const sprite = target as SpriteState;

    let bounced = false;
    let direction = sprite.direction;

    if (sprite.x < STAGE_MIN_X) {
      sprite.x = STAGE_MIN_X;
      // Reflect direction across the Y-axis
      direction = -direction;
      bounced = true;
    } else if (sprite.x > STAGE_MAX_X) {
      sprite.x = STAGE_MAX_X;
      direction = -direction;
      bounced = true;
    }

    if (sprite.y < STAGE_MIN_Y) {
      sprite.y = STAGE_MIN_Y;
      // Reflect direction across the X-axis
      direction = 180 - direction;
      bounced = true;
    } else if (sprite.y > STAGE_MAX_Y) {
      sprite.y = STAGE_MAX_Y;
      direction = 180 - direction;
      bounced = true;
    }

    if (bounced) {
      sprite.direction = this.normalizeDirection(direction);
    }

    return { nextBlockId: block.next, didMutate: bounced };
  }

  /**
   * Normalizes a direction to the Scratch-compatible range (-180, 180].
   * Deterministic, safe modulo handling, negative-angle safe.
   */
  private normalizeDirection(direction: number): number {
    if (!Number.isFinite(direction)) {
      console.warn(`[Runtime Diagnostics] invalid direction inputs: Direction value "${direction}" is not finite. Defaulting to 90.`);
      return 90;
    }
    let d = direction % 360;
    if (d <= -180) d += 360;
    if (d > 180) d -= 360;
    return d || 0; // Prevent -0
  }

  // ─── Sensing handlers (Phase 7J) ──────────────────────────────────
  private executeSensingResetTimer(_thread: Thread, _block: ASTBlock, _target: TargetState): BlockExecutionResult {
    if (this.onResetTimer) this.onResetTimer();
    return { nextBlockId: _block.next, didMutate: true };
  }

  // ─── Interaction handlers (Phase 7K) ────────────────────────────
  private executeSensingAskAndWait(thread: Thread, block: ASTBlock, _target: TargetState): BlockExecutionResult {
    const question = this.resolveInput(thread, block, 'QUESTION', '');
    const questionStr = typeof question === 'string' ? question : String(question);

    if (block.next !== null) {
      thread.stack.push(block.next);
    }

    if (this.onAskQuestion) {
      this.onAskQuestion(thread, questionStr);
    }

    thread.status = 'BLOCKED';

    return { nextBlockId: null, didMutate: true };
  }

  // ─── Electronics handlers (Phase 7X) ──────────────────────────────
  private executeElectronicsSetPinHigh(thread: Thread, block: ASTBlock, _target: TargetState): BlockExecutionResult {
    const componentId = String(this.resolveInput(thread, block, 'COMPONENT_ID', '') || block.fields['COMPONENT_ID']?.value || '');
    const pinId = String(this.resolveInput(thread, block, 'PIN_ID', '') || block.fields['PIN_ID']?.value || '');
    if (!componentId) {
      console.warn(`[Runtime Diagnostics] missing component IDs: electronics_setpinhigh called with empty COMPONENT_ID in target "${thread.targetId}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    if (!pinId) {
      console.warn(`[Runtime Diagnostics] missing pins: electronics_setpinhigh called with empty PIN_ID in target "${thread.targetId}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    if (this.onSetPinState) {
      this.onSetPinState(componentId, pinId, true);
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeElectronicsSetPinLow(thread: Thread, block: ASTBlock, _target: TargetState): BlockExecutionResult {
    const componentId = String(this.resolveInput(thread, block, 'COMPONENT_ID', '') || block.fields['COMPONENT_ID']?.value || '');
    const pinId = String(this.resolveInput(thread, block, 'PIN_ID', '') || block.fields['PIN_ID']?.value || '');
    if (!componentId) {
      console.warn(`[Runtime Diagnostics] missing component IDs: electronics_setpinlow called with empty COMPONENT_ID in target "${thread.targetId}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    if (!pinId) {
      console.warn(`[Runtime Diagnostics] missing pins: electronics_setpinlow called with empty PIN_ID in target "${thread.targetId}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    if (this.onSetPinState) {
      this.onSetPinState(componentId, pinId, false);
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeElectronicsSetServoAngle(thread: Thread, block: ASTBlock, _target: TargetState): BlockExecutionResult {
    const componentId = String(this.resolveInput(thread, block, 'COMPONENT_ID', '') || block.fields['COMPONENT_ID']?.value || '');
    const angle = this.resolveInputValue(thread, block, 'ANGLE', 0);
    if (!componentId) {
      console.warn(`[Runtime Diagnostics] missing component IDs: electronics_setservoangle called with empty COMPONENT_ID in target "${thread.targetId}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    if (!Number.isFinite(angle)) {
      console.warn(`[Runtime Diagnostics] invalid angles: Servo angle "${angle}" is not a finite number for target "${thread.targetId}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    if (this.onSetServoAngle) {
      this.onSetServoAngle(componentId, angle);
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeElectronicsSetLCDText(thread: Thread, block: ASTBlock, _target: TargetState): BlockExecutionResult {
    const componentId = String(this.resolveInput(thread, block, 'COMPONENT_ID', '') || block.fields['COMPONENT_ID']?.value || '');
    const textVal = String(this.resolveInput(thread, block, 'TEXT', '') ?? block.fields['TEXT']?.value ?? '');
    if (!componentId) {
      console.warn(`[Runtime Diagnostics] missing component IDs: electronics_setlcdtext called with empty COMPONENT_ID in target "${thread.targetId}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    if (typeof textVal !== 'string') {
      console.warn(`[Runtime Diagnostics] invalid text values: LCD text must be a string for target "${thread.targetId}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    if (this.onSetLCDText) {
      this.onSetLCDText(componentId, textVal);
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeElectronicsSetOLEDText(thread: Thread, block: ASTBlock, _target: TargetState): BlockExecutionResult {
    const componentId = String(this.resolveInput(thread, block, 'COMPONENT_ID', '') || block.fields['COMPONENT_ID']?.value || '');
    const textVal = String(this.resolveInput(thread, block, 'TEXT', '') ?? block.fields['TEXT']?.value ?? '');
    if (!componentId) {
      console.warn(`[Runtime Diagnostics] missing component IDs: electronics_setoledtext called with empty COMPONENT_ID in target "${thread.targetId}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    if (typeof textVal !== 'string') {
      console.warn(`[Runtime Diagnostics] invalid text values: OLED text must be a string for target "${thread.targetId}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    if (this.onSetOLEDText) {
      this.onSetOLEDText(componentId, textVal);
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeElectronicsBuzzerOn(thread: Thread, block: ASTBlock, _target: TargetState): BlockExecutionResult {
    const componentId = String(this.resolveInput(thread, block, 'COMPONENT_ID', '') || block.fields['COMPONENT_ID']?.value || '');
    if (!componentId) {
      console.warn(`[Runtime Diagnostics] missing component IDs: electronics_buzzeron called with empty COMPONENT_ID in target "${thread.targetId}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    if (this.onSetBuzzerState) {
      this.onSetBuzzerState(componentId, true);
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeElectronicsBuzzerOff(thread: Thread, block: ASTBlock, _target: TargetState): BlockExecutionResult {
    const componentId = String(this.resolveInput(thread, block, 'COMPONENT_ID', '') || block.fields['COMPONENT_ID']?.value || '');
    if (!componentId) {
      console.warn(`[Runtime Diagnostics] missing component IDs: electronics_buzzeroff called with empty COMPONENT_ID in target "${thread.targetId}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    if (this.onSetBuzzerState) {
      this.onSetBuzzerState(componentId, false);
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  // ─── Variable handlers ───────────────────────────────────────────
  private executeVariableSet(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const varName = block.fields['VARIABLE']?.value as string;
    if (!varName) {
      console.warn(`[Runtime Engine] Missing VARIABLE field in data_setvariableto block "${block.id}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    const newValue = this.resolveInputValue(thread, block, 'VALUE', 0);
    
    let varId = varName;
    let actualTargetId: string | undefined = target.id;
    let varEntry = Object.values(target.variables).find(v => v.name === varName);
    
    if (varEntry) {
      varEntry.value = newValue;
      varId = varEntry.id;
    } else {
      // Look up stage
      const stage = Array.from(this.targets.values()).find(t => t.isStage);
      const stageVar = stage ? Object.values(stage.variables).find(v => v.name === varName) : undefined;
      if (stageVar) {
        stageVar.value = newValue;
        varId = stageVar.id;
        actualTargetId = undefined;
      }
    }
    
    thread.context.variables[varName] = newValue;

    if (this.onVariableChanged) {
      this.onVariableChanged(varId, actualTargetId, newValue);
    }

    return { nextBlockId: block.next, didMutate: true };
  }

  private executeVariableChange(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const varName = block.fields['VARIABLE']?.value as string;
    if (!varName) {
      console.warn(`[Runtime Engine] Missing VARIABLE field in data_changevariableby block "${block.id}".`);
      return { nextBlockId: block.next, didMutate: false };
    }
    const delta = this.resolveInputValue(thread, block, 'VALUE', 1);
    
    let varId = varName;
    let actualTargetId: string | undefined = target.id;
    let varEntry = Object.values(target.variables).find(v => v.name === varName);
    let finalValue: unknown = 0;

    if (varEntry) {
      const current = typeof varEntry.value === 'number' ? varEntry.value : parseFloat(String(varEntry.value)) || 0;
      varEntry.value = current + delta;
      thread.context.variables[varName] = varEntry.value;
      varId = varEntry.id;
      finalValue = varEntry.value;
    } else {
      // Look up stage
      const stage = Array.from(this.targets.values()).find(t => t.isStage);
      const stageVar = stage ? Object.values(stage.variables).find(v => v.name === varName) : undefined;
      if (stageVar) {
        const current = typeof stageVar.value === 'number' ? stageVar.value : parseFloat(String(stageVar.value)) || 0;
        stageVar.value = current + delta;
        thread.context.variables[varName] = stageVar.value;
        varId = stageVar.id;
        finalValue = stageVar.value;
        actualTargetId = undefined;
      } else {
        console.warn(`[Runtime Engine] Variable "${varName}" not found on target "${target.id}" during data_changevariableby execution.`);
      }
    }

    if (this.onVariableChanged) {
      this.onVariableChanged(varId, actualTargetId, finalValue);
    }

    return { nextBlockId: block.next, didMutate: true };
  }

  // ─── Audio handlers (Phase 7E) ───────────────────────────────────
  private executeSoundPlay(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const soundInput = this.resolveInput(thread, block, 'SOUND_MENU', undefined) ?? this.resolveInput(thread, block, 'SOUND', undefined);
    let soundNameOrId = '';
    if (soundInput !== undefined) {
      soundNameOrId = String(soundInput);
    } else {
      const fieldVal = block.fields['SOUND_MENU']?.value ?? block.fields['SOUND']?.value;
      if (fieldVal !== undefined) {
        soundNameOrId = String(fieldVal);
      }
    }

    if (soundNameOrId && this.onSoundTrigger) {
      this.onSoundTrigger(target.id, soundNameOrId, false);
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeSoundPlayUntilDone(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const soundInput = this.resolveInput(thread, block, 'SOUND_MENU', undefined) ?? this.resolveInput(thread, block, 'SOUND', undefined);
    let soundNameOrId = '';
    if (soundInput !== undefined) {
      soundNameOrId = String(soundInput);
    } else {
      const fieldVal = block.fields['SOUND_MENU']?.value ?? block.fields['SOUND']?.value;
      if (fieldVal !== undefined) {
        soundNameOrId = String(fieldVal);
      }
    }

    if (soundNameOrId && this.onSoundTrigger) {
      const result = this.onSoundTrigger(target.id, soundNameOrId, false);
      if (result) {
        thread.status = 'WAITING';
        thread.delayMs = result.durationMs;
        thread.waitingOnSoundId = result.triggerId;
        return { nextBlockId: block.next, didMutate: true };
      }
    }
    return { nextBlockId: block.next, didMutate: false };
  }

  private executeSoundStopAllSounds(thread: Thread, block: ASTBlock, _target: TargetState): BlockExecutionResult {
    if (this.onStopAllSounds) {
      this.onStopAllSounds();
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeSoundChangeVolumeBy(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const val = this.coerceToNumber(this.resolveInput(thread, block, 'VOLUME', 0));
    target.volume = Math.max(0, Math.min(100, target.volume + val));
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeSoundSetVolumeTo(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const val = this.coerceToNumber(this.resolveInput(thread, block, 'VOLUME', 100));
    target.volume = Math.max(0, Math.min(100, val));
    return { nextBlockId: block.next, didMutate: true };
  }

  // ─── Hardware handlers ───────────────────────────────────────────
  private executeHardwareDigitalWrite(thread: Thread, block: ASTBlock): BlockExecutionResult {
    const pin = this.resolveInputValue(thread, block, 'PIN', 0);
    const value = this.resolveInputValue(thread, block, 'VALUE', 0);
    this.hardwareAdapter.digitalWrite(pin, value);
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeHardwareDigitalRead(thread: Thread, block: ASTBlock): BlockExecutionResult {
    const pin = this.resolveInputValue(thread, block, 'PIN', 0);
    const val = this.hardwareAdapter.digitalRead(pin);
    return { nextBlockId: block.next, didMutate: false, returnValue: val };
  }

  private executeHardwareAnalogRead(thread: Thread, block: ASTBlock): BlockExecutionResult {
    const pin = this.resolveInputValue(thread, block, 'PIN', 0);
    const val = this.hardwareAdapter.analogRead(pin);
    return { nextBlockId: block.next, didMutate: false, returnValue: val };
  }

  private executeHardwareAnalogWrite(thread: Thread, block: ASTBlock): BlockExecutionResult {
    const pin = this.resolveInputValue(thread, block, 'PIN', 0);
    const value = this.resolveInputValue(thread, block, 'VALUE', 0);
    this.hardwareAdapter.analogWrite(pin, value);
    return { nextBlockId: block.next, didMutate: true };
  }

  // ─── Pen handlers (Phase 7F) ─────────────────────────────────────
  private recordPenLine(target: TargetState, oldX: number, oldY: number, newX: number, newY: number): void {
    if (target.pen?.isPenDown && this.onPenCommand && (oldX !== newX || oldY !== newY)) {
      if (typeof oldX !== 'number' || isNaN(oldX) || !isFinite(oldX) ||
          typeof oldY !== 'number' || isNaN(oldY) || !isFinite(oldY) ||
          typeof newX !== 'number' || isNaN(newX) || !isFinite(newX) ||
          typeof newY !== 'number' || isNaN(newY) || !isFinite(newY)) {
        console.warn(`[Runtime Diagnostics] malformed pen commands: Invalid non-finite coordinate values for Pen LINE.`);
      }
      this.onPenCommand({
        id: '',
        type: 'LINE',
        targetId: target.id,
        x1: oldX,
        y1: oldY,
        x2: newX,
        y2: newY,
        color: target.pen.color,
        size: target.pen.size,
        timestamp: 0
      });
    }
  }

  private executePenPenDown(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    if (!target.pen) {
      target.pen = { isPenDown: false, color: '#4c97ff', size: 1 };
    }
    target.pen.isPenDown = true;
    return { nextBlockId: block.next, didMutate: true };
  }

  private executePenPenUp(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    if (!target.pen) {
      target.pen = { isPenDown: false, color: '#4c97ff', size: 1 };
    }
    target.pen.isPenDown = false;
    return { nextBlockId: block.next, didMutate: true };
  }

  private executePenClear(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    if (!target.pen) {
      target.pen = { isPenDown: false, color: '#4c97ff', size: 1 };
    }
    if (this.onPenCommand) {
      this.onPenCommand({
        id: '',
        type: 'CLEAR',
        targetId: target.id,
        color: target.pen.color,
        size: target.pen.size,
        timestamp: 0
      });
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  private executePenSetColorToColor(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const colorVal = String(this.resolveInput(thread, block, 'COLOR', '#4c97ff') ?? block.fields['COLOR']?.value ?? '#4c97ff');
    if (!target.pen) {
      target.pen = { isPenDown: false, color: '#4c97ff', size: 1 };
    }
    // Validation: simple validation for color field presence
    if (!colorVal || colorVal.trim() === '') {
      console.warn(`[Runtime Diagnostics] invalid color fields: Color value is empty.`);
    }
    target.pen.color = colorVal;
    return { nextBlockId: block.next, didMutate: true };
  }

  private executePenChangeSizeBy(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const change = this.coerceToNumber(this.resolveInput(thread, block, 'SIZE', 1));
    if (!target.pen) {
      target.pen = { isPenDown: false, color: '#4c97ff', size: 1 };
    }
    const targetSize = target.pen.size + change;
    if (targetSize < 1) {
      console.warn(`[Runtime Diagnostics] negative pen sizes: Clamping pen size to 1.`);
    }
    target.pen.size = Math.max(1, targetSize);
    return { nextBlockId: block.next, didMutate: true };
  }

  private executePenSetSizeTo(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const sizeVal = this.coerceToNumber(this.resolveInput(thread, block, 'SIZE', 1));
    if (!target.pen) {
      target.pen = { isPenDown: false, color: '#4c97ff', size: 1 };
    }
    if (sizeVal < 1) {
      console.warn(`[Runtime Diagnostics] negative pen sizes: Clamping pen size to 1.`);
    }
    target.pen.size = Math.max(1, sizeVal);
    return { nextBlockId: block.next, didMutate: true };
  }

  // ─── Input resolution helpers ────────────────────────────────────
  private resolveInput(thread: Thread, block: ASTBlock, inputName: string, defaultValue: unknown): unknown {
    const input = block.inputs[inputName];
    if (!input) return defaultValue;

    const val = input.value;
    if (val && typeof val === 'object' && 'opcode' in val) {
      return this.evaluateReporter(thread, val as ASTBlock);
    } else if (typeof val === 'string') {
      const refBlock = this.findBlock(thread, val);
      if (refBlock) {
        return this.evaluateReporter(thread, refBlock);
      }
    }
    return val;
  }

  private resolveInputValue(thread: Thread, block: ASTBlock, inputName: string, defaultValue: number): number {
    const val = this.resolveInput(thread, block, inputName, defaultValue);
    return this.coerceToNumber(val);
  }

  private coerceToNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        console.warn(`[Runtime Diagnostics] Value is not finite: ${value}. Defaulting to 0.`);
        return 0;
      }
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!Number.isFinite(parsed)) {
        console.warn(`[Runtime Diagnostics] Value is not finite: ${value}. Defaulting to 0.`);
        return 0;
      }
      return parsed;
    }
    return 0;
  }

  private coerceToBoolean(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0 && !isNaN(value);
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'false' || lower === '0' || lower === '') return false;
      return true;
    }
    return !!value;
  }

  private coerceToString(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number' && isNaN(value)) return '';
    return String(value);
  }

  private compareValues(op1: unknown, op2: unknown): number {
    const num1 = this.coerceToNumber(op1);
    const num2 = this.coerceToNumber(op2);

    const isNum1 = typeof op1 === 'number' || (typeof op1 === 'string' && !isNaN(Number(op1)) && op1.trim() !== '');
    const isNum2 = typeof op2 === 'number' || (typeof op2 === 'string' && !isNaN(Number(op2)) && op2.trim() !== '');

    if (isNum1 && isNum2) {
      if (num1 < num2) return -1;
      if (num1 > num2) return 1;
      return 0;
    }

    const str1 = this.coerceToString(op1).toLowerCase();
    const str2 = this.coerceToString(op2).toLowerCase();
    if (str1 < str2) return -1;
    if (str1 > str2) return 1;
    return 0;
  }

  /**
   * Evaluates a reporter block (expression) recursively using a clean dispatch registry.
   * Wraps evaluation in a try-catch block for complete error isolation.
   */
  evaluateReporter(thread: Thread, blockIdOrBlock: BlockId | ASTBlock): unknown {
    try {
      let block: ASTBlock | undefined;
      if (typeof blockIdOrBlock === 'string') {
        block = this.findBlock(thread, blockIdOrBlock);
      } else {
        block = blockIdOrBlock;
      }

      if (!block) {
        console.warn(`[Runtime Engine] Malformed reporter reference or missing reporter block: "${blockIdOrBlock}" in target "${thread.targetId}".`);
        return 0;
      }

      const opcode = block.opcode;
      const handler = this.reporterHandlers[opcode];
      if (handler) {
        return handler(thread, block);
      }

      console.warn(`[Runtime Engine] Unknown reporter opcode: "${opcode}" in target "${thread.targetId}". Returning safe default.`);
      return 0;
    } catch (error: any) {
      console.warn(`[Runtime Engine] Error evaluating reporter "${typeof blockIdOrBlock === 'string' ? blockIdOrBlock : blockIdOrBlock?.id}" (opcode: "${typeof blockIdOrBlock === 'string' ? '' : blockIdOrBlock?.opcode}") in target "${thread.targetId}": ${error?.message || error}`);
      
      // Safe deterministic failure semantics: mark thread DONE + isKilled, swept in next phase
      thread.status = 'DONE';
      thread.isKilled = true;
      thread.currentBlockId = null;

      return 0;
    }
  }

  // ─── Reporter Opcode Handlers Dispatch Map ───────────────────────
  private reporterHandlers: Record<string, (thread: Thread, block: ASTBlock) => unknown> = {
    // Arithmetic reporters
    'operator_add': (thread, block) => {
      const left = this.coerceToNumber(this.resolveInput(thread, block, 'NUM1', 0));
      const right = this.coerceToNumber(this.resolveInput(thread, block, 'NUM2', 0));
      const res = left + right;
      return isNaN(res) ? 0 : res;
    },
    'operator_subtract': (thread, block) => {
      const left = this.coerceToNumber(this.resolveInput(thread, block, 'NUM1', 0));
      const right = this.coerceToNumber(this.resolveInput(thread, block, 'NUM2', 0));
      const res = left - right;
      return isNaN(res) ? 0 : res;
    },
    'operator_multiply': (thread, block) => {
      const left = this.coerceToNumber(this.resolveInput(thread, block, 'NUM1', 0));
      const right = this.coerceToNumber(this.resolveInput(thread, block, 'NUM2', 0));
      const res = left * right;
      return isNaN(res) ? 0 : res;
    },
    'operator_divide': (thread, block) => {
      const left = this.coerceToNumber(this.resolveInput(thread, block, 'NUM1', 0));
      const right = this.coerceToNumber(this.resolveInput(thread, block, 'NUM2', 0));
      if (right === 0) {
        return left >= 0 ? Infinity : -Infinity;
      }
      const res = left / right;
      return isNaN(res) ? 0 : res;
    },
    'operator_mod': (thread, block) => {
      const left = this.coerceToNumber(this.resolveInput(thread, block, 'NUM1', 0));
      const right = this.coerceToNumber(this.resolveInput(thread, block, 'NUM2', 0));
      if (right === 0) return 0;
      const res = left % right;
      return isNaN(res) ? 0 : res;
    },

    // Comparison reporters
    'operator_equals': (thread, block) => {
      const op1 = this.resolveInput(thread, block, 'OPERAND1', '');
      const op2 = this.resolveInput(thread, block, 'OPERAND2', '');
      return this.compareValues(op1, op2) === 0;
    },
    'operator_lt': (thread, block) => {
      const op1 = this.resolveInput(thread, block, 'OPERAND1', '');
      const op2 = this.resolveInput(thread, block, 'OPERAND2', '');
      return this.compareValues(op1, op2) < 0;
    },
    'operator_gt': (thread, block) => {
      const op1 = this.resolveInput(thread, block, 'OPERAND1', '');
      const op2 = this.resolveInput(thread, block, 'OPERAND2', '');
      return this.compareValues(op1, op2) > 0;
    },

    // Boolean reporters
    'operator_and': (thread, block) => {
      const left = this.coerceToBoolean(this.resolveInput(thread, block, 'OPERAND1', false));
      const right = this.coerceToBoolean(this.resolveInput(thread, block, 'OPERAND2', false));
      return left && right;
    },
    'operator_or': (thread, block) => {
      const left = this.coerceToBoolean(this.resolveInput(thread, block, 'OPERAND1', false));
      const right = this.coerceToBoolean(this.resolveInput(thread, block, 'OPERAND2', false));
      return left || right;
    },
    'operator_not': (thread, block) => {
      const val = this.coerceToBoolean(this.resolveInput(thread, block, 'OPERAND', false));
      return !val;
    },

    // Variable reporters
    'variable_get': (thread, block) => {
      const varName = block.fields['VARIABLE']?.value as string;
      if (!varName) {
        console.warn(`[Runtime Engine] Malformed variable block missing VARIABLE field in target "${thread.targetId}".`);
        return '';
      }
      if (thread.context.variables[varName] !== undefined) {
        return thread.context.variables[varName];
      }
      const target = this.targets.get(thread.targetId);
      const varEntry = target ? Object.values(target.variables).find(v => v.name === varName) : undefined;
      if (varEntry) {
        return varEntry.value;
      }
      console.warn(`[Runtime Engine] Variable "${varName}" not found in target "${thread.targetId}" or thread context. Returning empty string.`);
      return '';
    },

    // Audio reporter (Phase 7E)
    'sound_volume': (thread, block) => {
      const target = this.targets.get(thread.targetId);
      return target ? target.volume : 100;
    },

    // List reporters (Phase 7H)
    'data_itemoflist': (thread, block) => this.executeListItemOf(thread, block),
    'data_itemnumoflist': (thread, block) => this.executeListItemNumOf(thread, block),
    'data_lengthoflist': (thread, block) => this.executeListLengthOf(thread, block),
    'data_listcontainsitem': (thread, block) => this.executeListContainsItem(thread, block),

    // Motion reporters (Phase 7I)
    'motion_xposition': (thread, block) => {
      const target = this.targets.get(thread.targetId);
      if (!target || target.isStage) return 0;
      return (target as SpriteState).x;
    },
    'motion_yposition': (thread, block) => {
      const target = this.targets.get(thread.targetId);
      if (!target || target.isStage) return 0;
      return (target as SpriteState).y;
    },
    'motion_direction': (thread, block) => {
      const target = this.targets.get(thread.targetId);
      if (!target || target.isStage) return 90;
      return (target as SpriteState).direction;
    },

    // Sensing reporters (Phase 7J)
    'sensing_timer': (thread, block) => {
      if (this.onGetTimerMs) return this.onGetTimerMs() / 1000;
      return 0;
    },
    'sensing_mousex': (thread, block) => {
      if (this.onGetMouseState) return this.onGetMouseState().x;
      return 0;
    },
    'sensing_mousey': (thread, block) => {
      if (this.onGetMouseState) return this.onGetMouseState().y;
      return 0;
    },
    'sensing_mousedown': (thread, block) => {
      if (this.onGetMouseState) return this.onGetMouseState().isDown;
      return false;
    },
    'sensing_keypressed': (thread, block) => {
      const keyVal = this.resolveInput(thread, block, 'KEY_OPTION', '');
      if (!keyVal || typeof keyVal !== 'string') return false;
      if (this.onGetKeyboardState) {
        return this.onGetKeyboardState().pressedKeys.includes(keyVal.toLowerCase());
      }
      return false;
    },
    'sensing_touchingedge': (thread, block) => {
      if (this.onIsTouchingEdge) return this.onIsTouchingEdge(thread.targetId);
      return false;
    },
    'sensing_touchingobject': (thread, block) => {
      const objectVal = this.resolveInput(thread, block, 'OBJECT', '');
      const objectName = typeof objectVal === 'string' ? objectVal : String(objectVal);
      if (!objectName) {
        console.warn(`[Runtime Diagnostics] malformed sensing blocks: sensing_touchingobject called with empty OBJECT for target "${thread.targetId}".`);
        return false;
      }
      if (this.onIsTouchingObject) return this.onIsTouchingObject(thread.targetId, objectName);
      return false;
    },

    // Interaction reporters (Phase 7K)
    'sensing_answer': (thread, block) => {
      if (this.onGetAnswer) return this.onGetAnswer();
      return '';
    },

    // Electronics reporters (Phase 7X)
    'electronics_readpin': (thread, block) => {
      const componentId = String(this.resolveInput(thread, block, 'COMPONENT_ID', '') || block.fields['COMPONENT_ID']?.value || '');
      const pinId = String(this.resolveInput(thread, block, 'PIN_ID', '') || block.fields['PIN_ID']?.value || '');
      if (!componentId) {
        console.warn(`[Runtime Diagnostics] missing component IDs: electronics_readpin called with empty COMPONENT_ID in target "${thread.targetId}".`);
        return false;
      }
      if (!pinId) {
        console.warn(`[Runtime Diagnostics] missing pins: electronics_readpin called with empty PIN_ID in target "${thread.targetId}".`);
        return false;
      }
      if (this.onGetPinState) return this.onGetPinState(componentId, pinId);
      return false;
    },
    'electronics_readultrasonic': (thread, block) => {
      const componentId = String(this.resolveInput(thread, block, 'COMPONENT_ID', '') || block.fields['COMPONENT_ID']?.value || '');
      if (!componentId) {
        console.warn(`[Runtime Diagnostics] missing component IDs: electronics_readultrasonic called with empty COMPONENT_ID in target "${thread.targetId}".`);
        return 0;
      }
      if (this.onGetUltrasonicDistance) return this.onGetUltrasonicDistance(componentId);
      return 0;
    },
    'electronics_readtemperature': (thread, block) => {
      const componentId = String(this.resolveInput(thread, block, 'COMPONENT_ID', '') || block.fields['COMPONENT_ID']?.value || '');
      if (!componentId) {
        console.warn(`[Runtime Diagnostics] missing component IDs: electronics_readtemperature called with empty COMPONENT_ID in target "${thread.targetId}".`);
        return 0;
      }
      if (this.onGetTemperature) return this.onGetTemperature(componentId);
      return 0;
    },
    'electronics_readhumidity': (thread, block) => {
      const componentId = String(this.resolveInput(thread, block, 'COMPONENT_ID', '') || block.fields['COMPONENT_ID']?.value || '');
      if (!componentId) {
        console.warn(`[Runtime Diagnostics] missing component IDs: electronics_readhumidity called with empty COMPONENT_ID in target "${thread.targetId}".`);
        return 0;
      }
      if (this.onGetHumidity) return this.onGetHumidity(componentId);
      return 0;
    },
  };

  private resolveConditionValue(thread: Thread, block: ASTBlock, inputName: string, defaultValue: boolean): boolean {
    const val = this.resolveInput(thread, block, inputName, defaultValue);
    return this.coerceToBoolean(val);
  }

  private resolveSubstackId(block: ASTBlock, inputName: string): BlockId | null {
    const input = block.inputs[inputName];
    if (!input) return null;
    if (typeof input.value === 'string') {
      return input.value;
    }
    if (input.value && typeof input.value === 'object' && 'id' in input.value) {
      return (input.value as ASTBlock).id;
    }
    return null;
  }

  // ─── List statement/reporter helpers (Phase 7H) ───────────────────
  private findList(target: TargetState, listNameOrId: string): { list: ListState; actualTargetId: string | undefined } | undefined {
    if (!listNameOrId) return undefined;
    
    // 1. Search local lists
    let listEntry: ListState | undefined = target.lists[listNameOrId];
    if (listEntry) {
      return { list: listEntry, actualTargetId: target.id };
    }
    listEntry = Object.values(target.lists).find(l => l.name === listNameOrId || l.id === listNameOrId);
    if (listEntry) {
      return { list: listEntry, actualTargetId: target.id };
    }

    // 2. Search Stage lists (global)
    const stage = Array.from(this.targets.values()).find(t => t.isStage);
    if (stage && stage.id !== target.id) {
      let stageList: ListState | undefined = stage.lists[listNameOrId];
      if (stageList) {
        return { list: stageList, actualTargetId: undefined };
      }
      stageList = Object.values(stage.lists).find(l => l.name === listNameOrId || l.id === listNameOrId);
      if (stageList) {
        return { list: stageList, actualTargetId: undefined };
      }
    }
    return undefined;
  }

  private resolveListIndex(indexVal: unknown, listLength: number, allowAppend: boolean = false): number | 'last' | 'all' | 'invalid' {
    if (indexVal === 'last') return 'last';
    if (indexVal === 'all') return 'all';

    const indexStr = String(indexVal).toLowerCase();
    if (indexStr === 'last') return 'last';
    if (indexStr === 'all') return 'all';

    const num = Math.round(this.coerceToNumber(indexVal));
    if (isNaN(num)) return 'invalid';

    const maxBound = allowAppend ? listLength + 1 : listLength;
    if (num >= 1 && num <= maxBound) {
      return num;
    }
    return 'invalid';
  }

  private executeListAdd(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const listNameOrId = String(block.fields['LIST']?.value ?? this.resolveInput(thread, block, 'LIST', ''));
    const itemVal = this.resolveInput(thread, block, 'ITEM', '');

    const found = this.findList(target, listNameOrId);
    if (!found) {
      console.warn(`[Runtime Diagnostics] missing lists: List "${listNameOrId}" not found in target "${target.id}" or Stage.`);
      return { nextBlockId: block.next, didMutate: false };
    }

    const valueToAdd = typeof itemVal === 'object' && itemVal !== null ? JSON.parse(JSON.stringify(itemVal)) : itemVal;
    found.list.value.push(valueToAdd);

    if (this.onListChanged) {
      this.onListChanged(found.list.id, found.actualTargetId, [...found.list.value]);
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeListDelete(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const listNameOrId = String(block.fields['LIST']?.value ?? this.resolveInput(thread, block, 'LIST', ''));
    const indexInput = this.resolveInput(thread, block, 'INDEX', 1);

    const found = this.findList(target, listNameOrId);
    if (!found) {
      console.warn(`[Runtime Diagnostics] missing lists: List "${listNameOrId}" not found in target "${target.id}" or Stage.`);
      return { nextBlockId: block.next, didMutate: false };
    }

    const resolved = this.resolveListIndex(indexInput, found.list.value.length, false);
    if (resolved === 'invalid') {
      console.warn(`[Runtime Diagnostics] invalid list indexes: Delete index "${indexInput}" is invalid or out of bounds.`);
      return { nextBlockId: block.next, didMutate: false };
    }

    if (resolved === 'all') {
      found.list.value = [];
    } else if (resolved === 'last') {
      if (found.list.value.length > 0) {
        found.list.value.pop();
      }
    } else {
      found.list.value.splice(resolved - 1, 1);
    }

    if (this.onListChanged) {
      this.onListChanged(found.list.id, found.actualTargetId, [...found.list.value]);
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeListDeleteAll(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const listNameOrId = String(block.fields['LIST']?.value ?? this.resolveInput(thread, block, 'LIST', ''));

    const found = this.findList(target, listNameOrId);
    if (!found) {
      console.warn(`[Runtime Diagnostics] missing lists: List "${listNameOrId}" not found in target "${target.id}" or Stage.`);
      return { nextBlockId: block.next, didMutate: false };
    }

    found.list.value = [];

    if (this.onListChanged) {
      this.onListChanged(found.list.id, found.actualTargetId, [...found.list.value]);
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeListInsert(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const listNameOrId = String(block.fields['LIST']?.value ?? this.resolveInput(thread, block, 'LIST', ''));
    const indexInput = this.resolveInput(thread, block, 'INDEX', 1);
    const itemVal = this.resolveInput(thread, block, 'ITEM', '');

    const found = this.findList(target, listNameOrId);
    if (!found) {
      console.warn(`[Runtime Diagnostics] missing lists: List "${listNameOrId}" not found in target "${target.id}" or Stage.`);
      return { nextBlockId: block.next, didMutate: false };
    }

    const resolved = this.resolveListIndex(indexInput, found.list.value.length, true);
    if (resolved === 'invalid') {
      console.warn(`[Runtime Diagnostics] invalid list indexes: Insert index "${indexInput}" is invalid or out of bounds.`);
      return { nextBlockId: block.next, didMutate: false };
    }

    const valueToInsert = typeof itemVal === 'object' && itemVal !== null ? JSON.parse(JSON.stringify(itemVal)) : itemVal;

    if (resolved === 'last') {
      found.list.value.push(valueToInsert);
    } else if (resolved === 'all') {
      console.warn(`[Runtime Diagnostics] invalid list indexes: Cannot insert at index "all".`);
      return { nextBlockId: block.next, didMutate: false };
    } else {
      found.list.value.splice(resolved - 1, 0, valueToInsert);
    }

    if (this.onListChanged) {
      this.onListChanged(found.list.id, found.actualTargetId, [...found.list.value]);
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeListReplace(thread: Thread, block: ASTBlock, target: TargetState): BlockExecutionResult {
    const listNameOrId = String(block.fields['LIST']?.value ?? this.resolveInput(thread, block, 'LIST', ''));
    const indexInput = this.resolveInput(thread, block, 'INDEX', 1);
    const itemVal = this.resolveInput(thread, block, 'ITEM', '');

    const found = this.findList(target, listNameOrId);
    if (!found) {
      console.warn(`[Runtime Diagnostics] missing lists: List "${listNameOrId}" not found in target "${target.id}" or Stage.`);
      return { nextBlockId: block.next, didMutate: false };
    }

    const resolved = this.resolveListIndex(indexInput, found.list.value.length, false);
    if (resolved === 'invalid') {
      console.warn(`[Runtime Diagnostics] invalid list indexes: Replace index "${indexInput}" is invalid or out of bounds.`);
      return { nextBlockId: block.next, didMutate: false };
    }

    const valueToReplace = typeof itemVal === 'object' && itemVal !== null ? JSON.parse(JSON.stringify(itemVal)) : itemVal;

    if (resolved === 'last') {
      if (found.list.value.length > 0) {
        found.list.value[found.list.value.length - 1] = valueToReplace;
      }
    } else if (resolved === 'all') {
      console.warn(`[Runtime Diagnostics] invalid list indexes: Cannot replace at index "all".`);
      return { nextBlockId: block.next, didMutate: false };
    } else {
      found.list.value[resolved - 1] = valueToReplace;
    }

    if (this.onListChanged) {
      this.onListChanged(found.list.id, found.actualTargetId, [...found.list.value]);
    }
    return { nextBlockId: block.next, didMutate: true };
  }

  private executeListItemOf(thread: Thread, block: ASTBlock): unknown {
    const target = this.targets.get(thread.targetId);
    if (!target) return '';

    const listNameOrId = String(block.fields['LIST']?.value ?? this.resolveInput(thread, block, 'LIST', ''));
    const indexInput = this.resolveInput(thread, block, 'INDEX', 1);

    const found = this.findList(target, listNameOrId);
    if (!found) {
      console.warn(`[Runtime Diagnostics] missing lists: List "${listNameOrId}" not found in target "${target.id}" or Stage.`);
      return '';
    }

    const resolved = this.resolveListIndex(indexInput, found.list.value.length, false);
    if (resolved === 'invalid' || resolved === 'all') {
      console.warn(`[Runtime Diagnostics] invalid list indexes: ItemOf index "${indexInput}" is invalid or out of bounds.`);
      return '';
    }

    if (resolved === 'last') {
      return found.list.value.length > 0 ? found.list.value[found.list.value.length - 1] : '';
    }

    return found.list.value[resolved - 1] ?? '';
  }

  private executeListItemNumOf(thread: Thread, block: ASTBlock): number {
    const target = this.targets.get(thread.targetId);
    if (!target) return 0;

    const listNameOrId = String(block.fields['LIST']?.value ?? this.resolveInput(thread, block, 'LIST', ''));
    const itemVal = this.resolveInput(thread, block, 'ITEM', '');

    const found = this.findList(target, listNameOrId);
    if (!found) {
      console.warn(`[Runtime Diagnostics] missing lists: List "${listNameOrId}" not found in target "${target.id}" or Stage.`);
      return 0;
    }

    const searchValStr = String(itemVal).toLowerCase();
    const idx = found.list.value.findIndex(item => String(item).toLowerCase() === searchValStr);
    return idx === -1 ? 0 : idx + 1;
  }

  private executeListLengthOf(thread: Thread, block: ASTBlock): number {
    const target = this.targets.get(thread.targetId);
    if (!target) return 0;

    const listNameOrId = String(block.fields['LIST']?.value ?? this.resolveInput(thread, block, 'LIST', ''));

    const found = this.findList(target, listNameOrId);
    if (!found) {
      console.warn(`[Runtime Diagnostics] missing lists: List "${listNameOrId}" not found in target "${target.id}" or Stage.`);
      return 0;
    }

    return found.list.value.length;
  }

  private executeListContainsItem(thread: Thread, block: ASTBlock): boolean {
    const target = this.targets.get(thread.targetId);
    if (!target) return false;

    const listNameOrId = String(block.fields['LIST']?.value ?? this.resolveInput(thread, block, 'LIST', ''));
    const itemVal = this.resolveInput(thread, block, 'ITEM', '');

    const found = this.findList(target, listNameOrId);
    if (!found) {
      console.warn(`[Runtime Diagnostics] missing lists: List "${listNameOrId}" not found in target "${target.id}" or Stage.`);
      return false;
    }

    const searchValStr = String(itemVal).toLowerCase();
    return found.list.value.some(item => String(item).toLowerCase() === searchValStr);
  }
}
