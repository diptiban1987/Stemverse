import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { InMemoryRendererAdapter } from '../src/stage/renderer-adapter';
import { ASTBlock, ASTScript, SpriteState } from '../src/types';
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

describe('Phase 7B — Renderer Adapter Foundation', () => {
  let runtime: BaseRuntime;
  let adapter: InMemoryRendererAdapter;

  beforeEach(async () => {
    runtime = new BaseRuntime();
    await runtime.initialize();
    resetThreadCounter();
    adapter = new InMemoryRendererAdapter();
    adapter.initialize();
  });

  it('1. should synchronize and ingest visual snapshots correctly', () => {
    const s1 = makeSprite({ id: 's1', x: 10, y: 20, direction: 45, visible: true, size: 80 });
    runtime.addTarget(s1);

    const snapshot = runtime.getStageSnapshot();
    adapter.syncStage(snapshot);

    const target = adapter.targets.get('s1')!;
    expect(target).toBeDefined();
    expect(target.id).toBe('s1');
    expect(target.x).toBe(10);
    expect(target.y).toBe(20);
    expect(target.direction).toBe(45);
    expect(target.visible).toBe(true);
    expect(target.size).toBe(80);
  });

  it('2. should maintain deterministic layer ordering of targets', () => {
    const stage = makeSprite({ id: 'stage', isStage: true } as any);
    const s1 = makeSprite({ id: 's1', x: 0 });
    const s2 = makeSprite({ id: 's2', x: 0 });

    runtime.addTarget(stage);
    runtime.addTarget(s1);
    runtime.addTarget(s2);

    const snapshot = runtime.getStageSnapshot();
    adapter.syncStage(snapshot);

    const sorted = adapter.getSortedTargets();
    expect(sorted[0].id).toBe('stage');
    expect(sorted[1].id).toBe('s1');
    expect(sorted[2].id).toBe('s2');
  });

  it('3. should support clone renderer synchronization', () => {
    const parent = makeSprite({ id: 'parent', x: 50 });
    runtime.addTarget(parent);

    runtime.start();
    runtime.createCloneOf('parent');

    const snapshot = runtime.getStageSnapshot();
    adapter.syncStage(snapshot);

    const targets = Array.from(adapter.targets.values());
    const clone = targets.find(t => t.id !== 'parent');
    expect(clone).toBeDefined();
    expect(clone!.x).toBe(50);
    runtime.stop();
  });

  it('4. should sweep deleted/removed targets and clones from render state', () => {
    const s1 = makeSprite({ id: 's1' });
    const s2 = makeSprite({ id: 's2' });

    runtime.addTarget(s1);
    runtime.addTarget(s2);

    adapter.syncStage(runtime.getStageSnapshot());
    expect(adapter.targets.has('s2')).toBe(true);

    runtime.removeTarget('s2');
    adapter.syncStage(runtime.getStageSnapshot());

    expect(adapter.targets.has('s2')).toBe(false);
    expect(adapter.targets.has('s1')).toBe(true);
  });

  it('5. should trigger diagnostic warnings on malformed costume indices or invalid layer sequences', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Ingest invalid layer order
    adapter.syncStage([
      { targetId: 's1', x: 0, y: 0, direction: 90, visible: true, size: 100, currentCostume: 0, layerOrder: 2 },
      { targetId: 's2', x: 0, y: 0, direction: 90, visible: true, size: 100, currentCostume: 0, layerOrder: 1 } // Out of order!
    ]);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Runtime Diagnostics] invalid layer ordering')
    );

    // Ingest malformed costume index
    adapter.syncStage([
      { targetId: 's1', x: 0, y: 0, direction: 90, visible: true, size: 100, currentCostume: -5, layerOrder: 0 }
    ]);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Runtime Diagnostics] malformed costume indices')
    );

    warnSpy.mockRestore();
  });

  it('6. should synchronize speech and thought bubbles correctly', () => {
    const s1 = makeSprite({ id: 's1' });
    s1.sayBubble = { text: 'Hello, world!' };
    runtime.addTarget(s1);

    adapter.syncStage(runtime.getStageSnapshot());
    expect(adapter.targets.get('s1')?.sayBubble?.text).toBe('Hello, world!');
  });

  it('7. should respect snapshot immutability during renderer mutations', () => {
    const s1 = makeSprite({ id: 's1', x: 10 });
    runtime.addTarget(s1);

    const snapshot = runtime.getStageSnapshot();
    adapter.syncStage(snapshot);

    const target = adapter.targets.get('s1')!;
    target.x = 99; // Mutate renderer property

    expect(snapshot[0].x).toBe(10); // Original snapshot remains clean
    expect(s1.x).toBe(10); // VM state remains clean
  });

  it('8. should preserve render target object references across updates (Diff Safety)', () => {
    const s1 = makeSprite({ id: 's1', x: 10 });
    runtime.addTarget(s1);

    adapter.syncStage(runtime.getStageSnapshot());
    const ref1 = adapter.targets.get('s1')!;

    // Perform position update
    s1.x = 25;
    adapter.syncStage(runtime.getStageSnapshot());

    const ref2 = adapter.targets.get('s1')!;
    expect(ref1).toBe(ref2); // Object identity preserved!
    expect(ref2.x).toBe(25);
  });

  it('9. should guarantee renderer isolation from runtime', () => {
    const s1 = makeSprite({ id: 's1', x: 100 });
    runtime.addTarget(s1);

    adapter.syncStage(runtime.getStageSnapshot());
    const target = adapter.targets.get('s1')!;

    target.x = 500; // Mutate target inside adapter
    expect(s1.x).toBe(100); // VM target remains completely isolated!
  });

  it('10. should warn and sweep orphan renderer entries safely', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const s1 = makeSprite({ id: 's1' });
    runtime.addTarget(s1);

    adapter.syncStage(runtime.getStageSnapshot());
    expect(adapter.targets.has('s1')).toBe(true);

    // Sync with empty snapshot
    adapter.syncStage([]);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Runtime Diagnostics] orphan renderer entries')
    );
    expect(adapter.targets.has('s1')).toBe(false);

    warnSpy.mockRestore();
  });

  it('11. should preserve clone layer stability stack immediately above parent', () => {
    const stage = makeSprite({ id: 'stage', isStage: true } as any);
    const s1 = makeSprite({ id: 's1' });
    const s2 = makeSprite({ id: 's2' });

    runtime.addTarget(stage);
    runtime.addTarget(s1);
    runtime.addTarget(s2);

    runtime.start();
    runtime.createCloneOf('s1');

    adapter.syncStage(runtime.getStageSnapshot());
    const sorted = adapter.getSortedTargets();

    // Verify ordering sequence: Stage -> Parent s1 -> Clone -> s2
    expect(sorted[0].id).toBe('stage');
    expect(sorted[1].id).toBe('s1');
    expect(sorted[2].id.startsWith('s1_clone_')).toBe(true);
    expect(sorted[3].id).toBe('s2');

    runtime.stop();
  });

  it('12. should synchronize stage changes correctly after broadcast steps', () => {
    const blocks = [
      makeBlock({
        id: 'hat',
        opcode: 'event_whenbroadcastreceived',
        topLevel: true,
        fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'go' } },
        next: 'goto'
      }),
      makeBlock({ id: 'goto', opcode: 'motion_gotoxy', inputs: { X: { name: 'X', value: 200 }, Y: { name: 'Y', value: 300 } } })
    ];
    const s1 = makeSprite({ id: 's1', scripts: [makeScript('event_whenbroadcastreceived', blocks)] });
    runtime.addTarget(s1);

    runtime.start();
    runtime.triggerBroadcast('go');

    // Run ticks to process broadcast and run statement block
    runtime.stepOnce();
    runtime.stepOnce();

    adapter.syncStage(runtime.getStageSnapshot());
    expect(adapter.targets.get('s1')?.x).toBe(200);
    expect(adapter.targets.get('s1')?.y).toBe(300);

    runtime.stop();
  });
});
