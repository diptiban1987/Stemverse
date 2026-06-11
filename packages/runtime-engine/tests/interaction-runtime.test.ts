import { describe, it, expect, beforeEach } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { TargetState, SpriteState, StageState, ASTBlock, ASTScript, Thread } from '../src/types';
import { resetThreadCounter } from '../src/runtime/execution-context';
import { InMemoryRendererAdapter } from '../src/stage/renderer-adapter';

function makeBlock(id: string, opcode: string, next: string | null = null, inputs: Record<string, any> = {}, fields: Record<string, any> = {}): ASTBlock {
  return {
    id,
    opcode,
    next,
    inputs: Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, { name: k, value: v }])),
    fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { name: k, value: v }])),
    shadow: false,
    topLevel: false,
  };
}

function makeScript(hatOpcode: string, blocks: ASTBlock[]): ASTScript {
  return {
    id: `script_${blocks[0]?.id}`,
    hatOpcode,
    topBlockId: blocks[0]?.id || 'none',
    blocks: Object.fromEntries(blocks.map(b => [b.id, b])),
  };
}

function makeSprite(id: string, name: string, scripts: ASTScript[], overrides: Partial<SpriteState> = {}): SpriteState {
  return {
    id,
    name,
    isStage: false,
    variables: {},
    lists: {},
    costumes: [],
    currentCostumeIndex: 0,
    sounds: [],
    volume: 100,
    scripts,
    x: 0,
    y: 0,
    direction: 90,
    visible: true,
    size: 100,
    draggable: false,
    rotationStyle: 'all around',
    ...overrides,
  };
}

function makeStage(scripts: ASTScript[] = []): StageState {
  return {
    id: 'stage',
    name: 'Stage',
    isStage: true,
    variables: {},
    lists: {},
    costumes: [],
    currentCostumeIndex: 0,
    sounds: [],
    volume: 100,
    scripts,
    tempo: 60,
    videoState: 'off',
  };
}

describe('Phase 7K — Ask/Answer & Runtime Interaction Foundation', () => {
  let runtime: BaseRuntime;

  beforeEach(async () => {
    runtime = new BaseRuntime();
    await runtime.initialize();
    resetThreadCounter();
  });

  // ─── 1. Ask/Answer Blocking Lifecycle ──────────────────────────

  describe('Ask/Answer Blocking Lifecycle', () => {
    it('1. should block thread on sensing_askandwait', () => {
      const askBlock = makeBlock('ask1', 'sensing_askandwait', null, { QUESTION: 'What is your name?' });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'ask1');
      const script = makeScript('event_whenflagclicked', [hatBlock, askBlock]);
      const sprite = makeSprite('s1', 'Cat', [script]);

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();

      runtime.tick();

      const blockedThreads = runtime.activeThreads.filter(t => t.targetId === 's1' && t.status === 'BLOCKED');
      expect(blockedThreads.length).toBe(1);
      expect(blockedThreads[0].blockedOnQuestionId).toBeDefined();

      runtime.stop();
    });

    it('2. should resume execution after answer is submitted', () => {
      const moveBlock = makeBlock('move1', 'motion_gotoxy', null, { X: 99, Y: 99 });
      const askBlock = makeBlock('ask1', 'sensing_askandwait', 'move1', { QUESTION: 'Hello?' });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'ask1');
      const script = makeScript('event_whenflagclicked', [hatBlock, askBlock, moveBlock]);
      const sprite = makeSprite('s1', 'Cat', [script]);

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();

      runtime.tick();

      const blockedThread = runtime.activeThreads.find(t => t.targetId === 's1' && t.status === 'BLOCKED');
      expect(blockedThread).toBeDefined();

      runtime.submitAnswer('yes');
      expect(blockedThread!.status).toBe('RUNNING');

      runtime.tick();
      const s = runtime.getTargetById('s1') as SpriteState;
      expect(s.x).toBe(99);
      expect(s.y).toBe(99);

      runtime.stop();
    });

    it('3. should unblock thread when answer is submitted', () => {
      const askBlock = makeBlock('ask1', 'sensing_askandwait', null, { QUESTION: 'Name?' });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'ask1');
      const script = makeScript('event_whenflagclicked', [hatBlock, askBlock]);
      const sprite = makeSprite('s1', 'Cat', [script]);

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();

      runtime.tick();

      const blockedThread = runtime.activeThreads.find(t => t.status === 'BLOCKED');
      expect(blockedThread).toBeDefined();

      runtime.submitAnswer('Alice');

      expect(blockedThread!.status).toBe('RUNNING');
      expect(blockedThread!.blockedOnQuestionId).toBeUndefined();

      runtime.stop();
    });
  });

  // ─── 2. FIFO Ordering ──────────────────────────────────────────

  describe('FIFO Ordering', () => {
    it('4. should enqueue questions in FIFO order', () => {
      const qId1 = runtime.enqueueQuestion('t1', 's1', 'First?');
      const qId2 = runtime.enqueueQuestion('t2', 's1', 'Second?');
      const qId3 = runtime.enqueueQuestion('t3', 's1', 'Third?');

      const questions = runtime.getPendingQuestions();
      expect(questions[0].id).toBe(qId1);
      expect(questions[1].id).toBe(qId2);
      expect(questions[2].id).toBe(qId3);
    });

    it('5. should answer questions in FIFO order', () => {
      runtime.enqueueQuestion('t1', 's1', 'First?');
      runtime.enqueueQuestion('t2', 's1', 'Second?');

      runtime.submitAnswer('Answer1');

      const questions = runtime.getPendingQuestions();
      expect(questions[0].answered).toBe(true);
      expect(questions[1].answered).toBe(false);

      runtime.submitAnswer('Answer2');
      expect(runtime.getPendingQuestions()[1].answered).toBe(true);
    });
  });

  // ─── 3. Snapshot Immutability ─────────────────────────────────

  describe('Snapshot Immutability', () => {
    it('6. should produce deep-copied questions in snapshot', () => {
      runtime.enqueueQuestion('t1', 's1', 'Hello?');

      runtime.addTarget(makeStage());
      runtime.start();
      runtime.tick();

      const snapshot = runtime.getStageSnapshot();
      const stageSnap = snapshot.find(s => s.targetId === 'stage');
      expect(stageSnap?.questions).toBeDefined();
      expect(stageSnap!.questions!.length).toBe(1);

      stageSnap!.questions![0].question = 'MUTATED';
      expect(runtime.getPendingQuestions()[0].question).toBe('Hello?');

      runtime.stop();
    });

    it('7. should produce deep-copied answerState in snapshot', () => {
      runtime.submitAnswer('test answer');

      runtime.addTarget(makeStage());
      runtime.start();
      runtime.tick();

      const snapshot = runtime.getStageSnapshot();
      const stageSnap = snapshot.find(s => s.targetId === 'stage');
      expect(stageSnap?.answerState).toBeDefined();
      expect(stageSnap!.answerState!.currentAnswer).toBe('test answer');

      stageSnap!.answerState!.currentAnswer = 'MUTATED';
      expect(runtime.getAnswerState().currentAnswer).toBe('test answer');

      runtime.stop();
    });
  });

  // ─── 4. Clone-Safe Interaction ────────────────────────────────

  describe('Clone-Safe Interaction', () => {
    it('8. should isolate ask/answer per clone thread', () => {
      const askBlock = makeBlock('ask1', 'sensing_askandwait', null, { QUESTION: 'Clone question?' });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'ask1');
      const script = makeScript('event_whenflagclicked', [hatBlock, askBlock]);
      const sprite = makeSprite('s1', 'Cat', [script]);

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();

      runtime.tick();

      runtime.createCloneOf('s1');
      runtime.tick();

      const cloneThreads = runtime.activeThreads.filter(t => t.status === 'BLOCKED');
      expect(cloneThreads.length).toBeGreaterThanOrEqual(1);

      runtime.stop();
    });
  });

  // ─── 5. Broadcasts + Ask Cooperation ──────────────────────────

  describe('Broadcasts + Ask Cooperation', () => {
    it('9. should process broadcasts while a thread is blocked on a question', () => {
      const askBlock = makeBlock('ask1', 'sensing_askandwait', null, { QUESTION: 'Q?' });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'ask1');
      const askScript = makeScript('event_whenflagclicked', [hatBlock, askBlock]);
      const sprite1 = makeSprite('s1', 'Cat', [askScript]);

      const moveBlock = makeBlock('move1', 'motion_gotoxy', null, { X: 50, Y: 50 });
      const bcastHat = makeBlock('bhat1', 'event_whenbroadcastreceived', 'move1', {}, { BROADCAST_OPTION: 'msg' });
      const listenScript = makeScript('event_whenbroadcastreceived', [bcastHat, moveBlock]);
      const sprite2 = makeSprite('s2', 'Dog', [listenScript], { x: 0, y: 0 });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite1);
      runtime.addTarget(sprite2);
      runtime.start();

      runtime.tick();

      const blockedThread = runtime.activeThreads.find(t => t.status === 'BLOCKED');
      expect(blockedThread).toBeDefined();

      runtime.triggerBroadcast('msg');
      runtime.tick();

      const dog = runtime.getTargetById('s2') as SpriteState;
      expect(dog.x).toBe(50);
      expect(dog.y).toBe(50);

      const stillBlocked = runtime.activeThreads.find(t => t.id === blockedThread!.id && t.status === 'BLOCKED');
      expect(stillBlocked).toBeDefined();

      runtime.stop();
    });
  });

  // ─── 6. Answer Unblocking ────────────────────────────────────

  describe('Answer Unblocking', () => {
    it('10. should set answer state when answer is submitted', () => {
      runtime.enqueueQuestion('t1', 's1', 'Color?');
      runtime.submitAnswer('Blue');

      expect(runtime.getAnswerState().currentAnswer).toBe('Blue');
    });

    it('11. should return empty string for answer when no answer submitted', () => {
      expect(runtime.getAnswerState().currentAnswer).toBe('');
    });

    it('12. should report answer via sensing_answer reporter', () => {
      runtime.submitAnswer('42');

      const answerBlock = makeBlock('ans1', 'sensing_answer');
      const setBlock = makeBlock('set1', 'data_setvariableto', null, { VALUE: 'ans1' });
      setBlock.fields = { VARIABLE: { name: 'VARIABLE', value: 'answer_val' } };
      setBlock.inputs = { VALUE: { name: 'VALUE', value: 'ans1' } };
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'set1');
      const script = makeScript('event_whenflagclicked', [hatBlock, answerBlock, setBlock]);
      const sprite = makeSprite('s1', 'Cat', [script], { variables: { answer_val: { id: 'answer_val', name: 'answer_val', value: '' } } });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();

      runtime.tick();

      const varVal = sprite.variables['answer_val']?.value;
      expect(String(varVal)).toBe('42');

      runtime.stop();
    });
  });

  // ─── 7. Cleanup Lifecycle ────────────────────────────────────

  describe('Cleanup Lifecycle', () => {
    it('13. should clear questions on initialize', async () => {
      runtime.enqueueQuestion('t1', 's1', 'Q?');
      runtime.submitAnswer('A');
      expect(runtime.getPendingQuestions().length).toBe(1);

      await runtime.initialize();

      expect(runtime.getPendingQuestions().length).toBe(0);
      expect(runtime.getAnswerState().currentAnswer).toBe('');
    });

    it('14. should clear questions on stop', () => {
      runtime.enqueueQuestion('t1', 's1', 'Q?');
      runtime.submitAnswer('A');

      runtime.addTarget(makeStage());
      runtime.start();
      runtime.tick();
      runtime.stop();

      expect(runtime.getPendingQuestions().length).toBe(0);
      expect(runtime.getAnswerState().currentAnswer).toBe('');
    });

    it('15. should clear questions explicitly via clearQuestions', () => {
      runtime.enqueueQuestion('t1', 's1', 'Q1?');
      runtime.enqueueQuestion('t2', 's1', 'Q2?');
      expect(runtime.getPendingQuestions().length).toBe(2);

      runtime.clearQuestions();
      expect(runtime.getPendingQuestions().length).toBe(0);
    });
  });

  // ─── 8. Renderer/Runtime Isolation ────────────────────────────

  describe('Renderer/Runtime Isolation', () => {
    it('16. should not allow renderer question mutations to affect runtime', () => {
      runtime.enqueueQuestion('t1', 's1', 'Original?');

      runtime.addTarget(makeStage());
      runtime.start();
      runtime.tick();

      const snapshot = runtime.getStageSnapshot();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(snapshot);

      const stageTarget = adapter.targets.get('stage');
      expect(stageTarget?.questions).toBeDefined();
      expect(stageTarget!.questions!.length).toBe(1);
      expect(stageTarget!.questions![0].question).toBe('Original?');

      stageTarget!.questions![0].question = 'MUTATED';
      expect(runtime.getPendingQuestions()[0].question).toBe('Original?');

      runtime.stop();
    });

    it('17. should not allow renderer answerState mutations to affect runtime', () => {
      runtime.submitAnswer('secret');

      runtime.addTarget(makeStage());
      runtime.start();
      runtime.tick();

      const snapshot = runtime.getStageSnapshot();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(snapshot);

      const stageTarget = adapter.targets.get('stage');
      expect(stageTarget?.answerState).toBeDefined();
      expect(stageTarget!.answerState!.currentAnswer).toBe('secret');

      stageTarget!.answerState!.currentAnswer = 'LEAKED';
      expect(runtime.getAnswerState().currentAnswer).toBe('secret');

      runtime.stop();
    });

    it('18. should sync questions and answerState to pixi renderer adapter metadata', () => {
      runtime.enqueueQuestion('t1', 's1', 'Q?');
      runtime.submitAnswer('A1');

      runtime.addTarget(makeStage());
      runtime.start();
      runtime.tick();

      const snapshot = runtime.getStageSnapshot();
      const stageSnap = snapshot.find(s => s.targetId === 'stage');
      expect(stageSnap?.questions).toBeDefined();
      expect(stageSnap?.answerState).toBeDefined();
      expect(stageSnap!.questions![0].question).toBe('Q?');
      expect(stageSnap!.answerState!.currentAnswer).toBe('A1');

      runtime.stop();
    });
  });
});
