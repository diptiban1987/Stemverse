import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { InMemoryRendererAdapter } from '../src/stage/renderer-adapter';
import { PixiRendererAdapter } from '../src/stage/pixi-renderer-adapter';
import { ASTBlock, ASTScript, SpriteState, PenCommand } from '../src/types';
import { resetThreadCounter } from '../src/runtime/execution-context';

// ─── Test helpers ───────────────────────────────────────────────────

function makeBlock(overrides: Partial<ASTBlock> & { id: string; opcode: string }): ASTBlock {
  return {
    next: null,
    inputs: {},
    fields: {},
    shadow: false,
    topLevel: false,
    ...overrides,
  };
}

function makeSprite(overrides: Partial<SpriteState> = {}): SpriteState {
  return {
    id: 'sprite1',
    name: 'Sprite1',
    isStage: false,
    variables: {},
    lists: {},
    costumes: [],
    currentCostumeIndex: 0,
    sounds: [],
    volume: 100,
    scripts: [],
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

function makeScript(hatOpcode: string, blocks: ASTBlock[]): ASTScript {
  const blocksMap: Record<string, ASTBlock> = {};
  for (const block of blocks) {
    blocksMap[block.id] = block;
  }
  return {
    id: `script_${hatOpcode}_${Math.random().toString(36).substr(2, 5)}`,
    hatOpcode,
    topBlockId: blocks[0].id,
    blocks: blocksMap,
  };
}

describe('Phase 7F — Pen Layer & Vector Drawing Foundation', () => {
  let runtime: BaseRuntime;

  beforeEach(async () => {
    runtime = new BaseRuntime();
    await runtime.initialize();
    resetThreadCounter();
  });

  it('1. pen down/up state', async () => {
    const sprite = makeSprite({ id: 'sprite_pen' });
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'down' }),
      makeBlock({ id: 'down', opcode: 'pen_penDown', next: 'up' }),
      makeBlock({ id: 'up', opcode: 'pen_penUp' })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    runtime.addTarget(sprite);
    expect(sprite.pen).toBeDefined();
    expect(sprite.pen!.isPenDown).toBe(false);

    runtime.start();
    runtime.tick();

    expect(sprite.pen!.isPenDown).toBe(false); // thread executed hat -> down -> up, so isPenDown is false at the end
  });

  it('2. deterministic line accumulation', async () => {
    const sprite = makeSprite({ id: 'cat', x: 0, y: 0 });
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'down' }),
      makeBlock({ id: 'down', opcode: 'pen_penDown', next: 'move' }),
      makeBlock({
        id: 'move',
        opcode: 'motion_gotoxy',
        inputs: {
          X: { name: 'X', value: 100 },
          Y: { name: 'Y', value: 100 }
        }
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    runtime.addTarget(sprite);
    runtime.start();
    runtime.tick();

    expect(runtime.penCommands.length).toBe(1);
    const cmd = runtime.penCommands[0];
    expect(cmd.type).toBe('LINE');
    expect(cmd.targetId).toBe('cat');
    expect(cmd.x1).toBe(0);
    expect(cmd.y1).toBe(0);
    expect(cmd.x2).toBe(100);
    expect(cmd.y2).toBe(100);
    expect(cmd.color).toBe('#4c97ff');
    expect(cmd.size).toBe(1);
  });

  it('3. line ordering', async () => {
    const sprite = makeSprite({ id: 'cat', x: 0, y: 0 });
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'down' }),
      makeBlock({ id: 'down', opcode: 'pen_penDown', next: 'move1' }),
      makeBlock({
        id: 'move1',
        opcode: 'motion_gotoxy',
        inputs: {
          X: { name: 'X', value: 10 },
          Y: { name: 'Y', value: 20 }
        },
        next: 'move2'
      }),
      makeBlock({
        id: 'move2',
        opcode: 'motion_gotoxy',
        inputs: {
          X: { name: 'X', value: 30 },
          Y: { name: 'Y', value: 40 }
        }
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    runtime.addTarget(sprite);
    runtime.start();
    runtime.tick();

    expect(runtime.penCommands.length).toBe(2);
    expect(runtime.penCommands[0].x1).toBe(0);
    expect(runtime.penCommands[0].x2).toBe(10);
    expect(runtime.penCommands[1].x1).toBe(10);
    expect(runtime.penCommands[1].x2).toBe(30);
  });

  it('4. clone pen inheritance', async () => {
    const sprite = makeSprite({ id: 'parent', x: 0, y: 0 });
    await runtime.addTarget(sprite);
    
    sprite.pen!.isPenDown = true;
    sprite.pen!.color = '#ff0000';
    sprite.pen!.size = 5;

    runtime.createCloneOf('parent');

    const clone = runtime.getTargets().find(t => t.isClone)!;
    expect(clone).toBeDefined();
    expect(clone.pen).toBeDefined();
    expect(clone.pen!.isPenDown).toBe(true);
    expect(clone.pen!.color).toBe('#ff0000');
    expect(clone.pen!.size).toBe(5);
  });

  it('5. clone isolation', async () => {
    const sprite = makeSprite({ id: 'parent', x: 0, y: 0 });
    await runtime.addTarget(sprite);
    
    runtime.createCloneOf('parent');
    const clone = runtime.getTargets().find(t => t.isClone)!;

    runtime.start();
    clone.pen!.isPenDown = true;

    // Trigger movement on clone only
    runtime.interpreter.onPenCommand!({
      id: '',
      type: 'LINE',
      targetId: clone.id,
      x1: 0,
      y1: 0,
      x2: 50,
      y2: 50,
      color: '#4c97ff',
      size: 1,
      timestamp: 0
    });

    expect(runtime.penCommands.length).toBe(1);
    expect(runtime.penCommands[0].targetId).toBe(clone.id);
  });

  it('6. clear command emission', async () => {
    const sprite = makeSprite({ id: 'cat' });
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'clear' }),
      makeBlock({ id: 'clear', opcode: 'pen_clear' })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    runtime.addTarget(sprite);
    runtime.start();
    runtime.tick();

    expect(runtime.penCommands.length).toBe(1);
    expect(runtime.penCommands[0].type).toBe('CLEAR');
    expect(runtime.penCommands[0].targetId).toBe('cat');
  });

  it('7. snapshot immutability', async () => {
    const sprite = makeSprite({ id: 'cat', x: 0, y: 0 });
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'down' }),
      makeBlock({ id: 'down', opcode: 'pen_penDown', next: 'move' }),
      makeBlock({
        id: 'move',
        opcode: 'motion_gotoxy',
        inputs: {
          X: { name: 'X', value: 100 },
          Y: { name: 'Y', value: 100 }
        }
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    runtime.addTarget(sprite);
    runtime.start();
    runtime.tick();

    const snapshot = runtime.getStageSnapshot();
    const snap = snapshot[0];
    
    expect(snap.penCommands).toBeDefined();
    expect(snap.penCommands!.length).toBe(1);

    // Mutate the snapshot array
    snap.penCommands!.push({
      id: 'hacker',
      type: 'LINE',
      targetId: 'cat',
      color: '#000000',
      size: 1,
      timestamp: 0
    });

    // Verify runtime array is untouched
    expect(runtime.penCommands.length).toBe(1);
  });

  it('8. renderer ingestion', async () => {
    const sprite = makeSprite({ id: 'cat', x: 0, y: 0 });
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'down' }),
      makeBlock({ id: 'down', opcode: 'pen_penDown', next: 'move' }),
      makeBlock({
        id: 'move',
        opcode: 'motion_gotoxy',
        inputs: {
          X: { name: 'X', value: 10 },
          Y: { name: 'Y', value: 20 }
        }
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    runtime.addTarget(sprite);
    runtime.start();
    runtime.tick();

    const snapshot = runtime.getStageSnapshot();

    // 1. InMemoryRendererAdapter ingestion
    const inMem = new InMemoryRendererAdapter();
    inMem.initialize();
    inMem.syncStage(snapshot);

    expect(inMem.penCommands.length).toBe(1);
    expect(inMem.penCommands[0].x2).toBe(10);
    expect(inMem.targets.get('cat')!.pen!.isPenDown).toBe(true);

    // 2. PixiRendererAdapter ingestion
    const pixi = new PixiRendererAdapter();
    pixi.initialize();
    pixi.syncStage(snapshot);

    expect(pixi.penCommands.length).toBe(1);
    expect(pixi.penCommands[0].x2).toBe(10);
    expect(pixi.targets.get('cat')!.pen!.isPenDown).toBe(true);
  });

  it('9. invalid size clamping', async () => {
    const sprite = makeSprite({ id: 'cat' });
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'set_size' }),
      makeBlock({
        id: 'set_size',
        opcode: 'pen_setPenSizeTo',
        inputs: { SIZE: { name: 'SIZE', value: -10 } },
        next: 'change_size'
      }),
      makeBlock({
        id: 'change_size',
        opcode: 'pen_changePenSizeBy',
        inputs: { SIZE: { name: 'SIZE', value: -20 } }
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    runtime.addTarget(sprite);
    runtime.start();
    runtime.tick();

    expect(sprite.pen!.size).toBe(1); // clamped to >= 1
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('10. pen persistence across waits', async () => {
    const sprite = makeSprite({ id: 'cat', x: 0, y: 0 });
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'down' }),
      makeBlock({ id: 'down', opcode: 'pen_penDown', next: 'wait' }),
      makeBlock({
        id: 'wait',
        opcode: 'control_wait',
        inputs: { DURATION: { name: 'DURATION', value: 0.1 } },
        next: 'move'
      }),
      makeBlock({
        id: 'move',
        opcode: 'motion_gotoxy',
        inputs: { X: { name: 'X', value: 50 }, Y: { name: 'Y', value: 50 } }
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    runtime.addTarget(sprite);
    runtime.start();
    
    // Tick 1: Executes down, then wait begins
    runtime.tick();
    expect(sprite.pen!.isPenDown).toBe(true);
    expect(runtime.penCommands.length).toBe(0); // wait has blocked movement

    // Tick 2: Waiting
    runtime.tick();
    
    // Tick 3: Waiting finished, executes move
    runtime.tick();
    runtime.tick();

    expect(runtime.penCommands.length).toBe(1);
    expect(runtime.penCommands[0].x2).toBe(50);
  });

  it('11. pen + broadcasts', async () => {
    const sprite = makeSprite({ id: 'cat', x: 0, y: 0 });
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenbroadcastreceived', topLevel: true, next: 'down' }),
      makeBlock({ id: 'down', opcode: 'pen_penDown', next: 'move' }),
      makeBlock({
        id: 'move',
        opcode: 'motion_gotoxy',
        inputs: { X: { name: 'X', value: 5 }, Y: { name: 'Y', value: 5 } }
      })
    ];
    // setup BROADCAST_OPTION on hat
    blocks[0].fields = { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'go' } };
    sprite.scripts = [makeScript('event_whenbroadcastreceived', blocks)];

    runtime.addTarget(sprite);
    runtime.start();

    // Trigger broadcast
    runtime.triggerBroadcast('go');
    runtime.tick();

    expect(runtime.penCommands.length).toBe(1);
    expect(runtime.penCommands[0].x2).toBe(5);
  });

  it('12. pen + forever loops', async () => {
    const sprite = makeSprite({ id: 'cat', x: 0, y: 0 });
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'down' }),
      makeBlock({ id: 'down', opcode: 'pen_penDown', next: 'loop' }),
      makeBlock({
        id: 'loop',
        opcode: 'control_forever',
        inputs: {
          SUBSTACK: {
            name: 'SUBSTACK',
            value: 'move'
          }
        }
      }),
      makeBlock({
        id: 'move',
        opcode: 'motion_changexby',
        inputs: { DX: { name: 'DX', value: 2 } }
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    runtime.addTarget(sprite);
    runtime.start();
    
    // Tick 1: Executes hat -> down -> loop start -> change x by 2
    runtime.tick();
    expect(runtime.penCommands.length).toBe(1);
    expect(runtime.penCommands[0].x2).toBe(2);

    // Tick 2: loop continues -> change x by 2 again
    runtime.tick();
    expect(runtime.penCommands.length).toBe(2);
    expect(runtime.penCommands[1].x2).toBe(4);
  });

  it('13. pen + clone deletion', async () => {
    const sprite = makeSprite({ id: 'parent', x: 0, y: 0 });
    await runtime.addTarget(sprite);
    
    runtime.createCloneOf('parent');
    const clone = runtime.getTargets().find(t => t.isClone)!;

    runtime.start();
    clone.pen!.isPenDown = true;
    
    // Trigger clone movement
    runtime.interpreter.onPenCommand!({
      id: '',
      type: 'LINE',
      targetId: clone.id,
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 10,
      color: '#4c97ff',
      size: 1,
      timestamp: 0
    });

    expect(runtime.penCommands.length).toBe(1);

    // Delete clone
    runtime.deleteClone(clone.id);

    // Verify historical penCommands are still preserved
    expect(runtime.penCommands.length).toBe(1);
    expect(runtime.penCommands[0].targetId).toBe(clone.id);
  });

  it('14. pen command cleanup on stop()', async () => {
    const sprite = makeSprite({ id: 'cat', x: 0, y: 0 });
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'down' }),
      makeBlock({ id: 'down', opcode: 'pen_penDown', next: 'move' }),
      makeBlock({
        id: 'move',
        opcode: 'motion_gotoxy',
        inputs: { X: { name: 'X', value: 10 }, Y: { name: 'Y', value: 10 } }
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    runtime.addTarget(sprite);
    runtime.start();
    runtime.tick();

    expect(runtime.penCommands.length).toBe(1);

    runtime.stop();

    expect(runtime.penCommands.length).toBe(0);
    expect(runtime.penCommandCounter).toBe(0);
  });

  it('15. pen command cleanup on initialize()', async () => {
    const sprite = makeSprite({ id: 'cat', x: 0, y: 0 });
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'down' }),
      makeBlock({ id: 'down', opcode: 'pen_penDown', next: 'move' }),
      makeBlock({
        id: 'move',
        opcode: 'motion_gotoxy',
        inputs: { X: { name: 'X', value: 10 }, Y: { name: 'Y', value: 10 } }
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    runtime.addTarget(sprite);
    runtime.start();
    runtime.tick();

    expect(runtime.penCommands.length).toBe(1);

    await runtime.initialize();

    expect(runtime.penCommands.length).toBe(0);
    expect(runtime.penCommandCounter).toBe(0);
  });

  it('16. deterministic timestamps/order', async () => {
    const sprite = makeSprite({ id: 'cat', x: 0, y: 0 });
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'down' }),
      makeBlock({ id: 'down', opcode: 'pen_penDown', next: 'move' }),
      makeBlock({
        id: 'move',
        opcode: 'motion_gotoxy',
        inputs: { X: { name: 'X', value: 100 }, Y: { name: 'Y', value: 100 } }
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    runtime.addTarget(sprite);
    runtime.start();
    runtime.tick();

    const cmd = runtime.penCommands[0];
    expect(cmd.id).toBe('pen_1_0'); // tickCount = 1, penCommandCounter = 0
    expect(cmd.timestamp).toBe(1);
  });

  it('17. malformed coordinate warnings', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sprite = makeSprite({ id: 'cat', x: 0, y: 0 });
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'down' }),
      makeBlock({ id: 'down', opcode: 'pen_penDown', next: 'move' }),
      makeBlock({
        id: 'move',
        opcode: 'motion_gotoxy',
        inputs: { X: { name: 'X', value: NaN }, Y: { name: 'Y', value: Infinity } }
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    runtime.addTarget(sprite);
    runtime.start();
    runtime.tick();

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('18. renderer isolation safety', async () => {
    const sprite = makeSprite({ id: 'cat', x: 0, y: 0 });
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'down' }),
      makeBlock({ id: 'down', opcode: 'pen_penDown', next: 'move' }),
      makeBlock({
        id: 'move',
        opcode: 'motion_gotoxy',
        inputs: { X: { name: 'X', value: 10 }, Y: { name: 'Y', value: 10 } }
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    runtime.addTarget(sprite);
    runtime.start();
    runtime.tick();

    const snapshot = runtime.getStageSnapshot();
    const inMem = new InMemoryRendererAdapter();
    inMem.initialize();
    inMem.syncStage(snapshot);

    // Mutate renderer target properties directly
    inMem.targets.get('cat')!.pen!.color = '#000000';
    
    // Verify runtime target remains unaffected
    expect(sprite.pen!.color).toBe('#4c97ff');
  });
});
