import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { PixiRendererAdapter } from '../src/stage/pixi-renderer-adapter';
import { ASTBlock, ASTScript, SpriteState } from '../src/types';
import { resetThreadCounter } from '../src/runtime/execution-context';
import { Container, Graphics, Text } from 'pixi.js';

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

describe('Phase 7D — PixiJS Renderer Bridge', () => {
  let runtime: BaseRuntime;
  let adapter: PixiRendererAdapter;

  beforeEach(async () => {
    runtime = new BaseRuntime();
    await runtime.initialize();
    resetThreadCounter();
    adapter = new PixiRendererAdapter();
    adapter.initialize();
  });

  // 1. Pixi adapter initialization
  it('1. should verify Pixi adapter initialization correctness', () => {
    expect((adapter as any).isInitialized).toBe(true);
    expect(adapter.rootContainer).toBeInstanceOf(Container);
    expect(adapter.targetContainer).toBeInstanceOf(Container);
    expect(adapter.rootContainer!.children).toContain(adapter.targetContainer);
    expect(adapter.targets.size).toBe(0);
    expect(adapter.displayObjects.size).toBe(0);
  });

  // 2. snapshot synchronization
  it('2. should synchronize and ingest stage snapshots into Pixi containers', () => {
    const s1 = makeSprite({ id: 's1', x: 10, y: 20, direction: 45, visible: true, size: 80 });
    runtime.addTarget(s1);

    const snapshot = runtime.getStageSnapshot();
    adapter.syncStage(snapshot);

    // In-memory target checks
    const target = adapter.targets.get('s1')!;
    expect(target).toBeDefined();
    expect(target.x).toBe(10);
    expect(target.y).toBe(20);

    // Pixi display object checks
    const displayObj = adapter.displayObjects.get('s1')!;
    expect(displayObj).toBeInstanceOf(Container);
    expect(adapter.targetContainer!.children).toContain(displayObj);
  });

  // 3. transform synchronization
  it('3. should verify transform coordinates, direction, and size synchronization', () => {
    const s1 = makeSprite({ id: 's1', x: 50, y: -30, direction: 180, size: 150 });
    runtime.addTarget(s1);

    adapter.syncStage(runtime.getStageSnapshot());
    const displayObj = adapter.displayObjects.get('s1')!;

    // Position mapping: Scratch center (0,0) -> screen (240, 180)
    // 50 + 240 = 290
    expect(displayObj.x).toBe(290);
    // 180 - (-30) = 210
    expect(displayObj.y).toBe(210);

    // Direction mapping: 180 deg (down) -> radians
    // (180 - 90) * Math.PI / 180 = Math.PI / 2
    expect(displayObj.rotation).toBeCloseTo(Math.PI / 2);

    // Size mapping: 150% -> scale 1.5
    expect(displayObj.scale.x).toBeCloseTo(1.5);
    expect(displayObj.scale.y).toBeCloseTo(1.5);
  });

  // 4. visibility synchronization
  it('4. should synchronize target visibility correctly', () => {
    const s1 = makeSprite({ id: 's1', visible: false });
    runtime.addTarget(s1);

    adapter.syncStage(runtime.getStageSnapshot());
    const displayObj = adapter.displayObjects.get('s1')!;
    expect(displayObj.visible).toBe(false);

    // Update visibility to true
    s1.visible = true;
    adapter.syncStage(runtime.getStageSnapshot());
    expect(displayObj.visible).toBe(true);
  });

  // 5. layer ordering stability
  it('5. should maintain deterministic, stable layer ordering in the Pixi container', () => {
    const stage = makeSprite({ id: 'stage', isStage: true } as any);
    const s1 = makeSprite({ id: 's1' });
    const s2 = makeSprite({ id: 's2' });

    runtime.addTarget(stage);
    runtime.addTarget(s1);
    runtime.addTarget(s2);

    adapter.syncStage(runtime.getStageSnapshot());

    // Verify ordering sequence in targetContainer children list
    expect(adapter.targetContainer!.children[0]).toBe(adapter.displayObjects.get('stage'));
    expect(adapter.targetContainer!.children[1]).toBe(adapter.displayObjects.get('s1'));
    expect(adapter.targetContainer!.children[2]).toBe(adapter.displayObjects.get('s2'));
  });

  // 6. clone rendering synchronization
  it('6. should support independent clone rendering with dedicated Pixi containers', () => {
    const parent = makeSprite({ id: 'parent', x: 50 });
    runtime.addTarget(parent);

    runtime.start();
    runtime.createCloneOf('parent');

    const snapshot = runtime.getStageSnapshot();
    adapter.syncStage(snapshot);

    const cloneId = Array.from(adapter.displayObjects.keys()).find(id => id !== 'parent');
    expect(cloneId).toBeDefined();

    const parentObj = adapter.displayObjects.get('parent')!;
    const cloneObj = adapter.displayObjects.get(cloneId!)!;

    // Ensure distinct container objects
    expect(parentObj).not.toBe(cloneObj);
    expect(cloneObj.x).toBe(parentObj.x); // Inherits coordinates

    runtime.stop();
  });

  // 7. orphan Pixi cleanup
  it('7. should sweep deleted targets/clones and destroy their Pixi elements without leaks', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const s1 = makeSprite({ id: 's1' });
    runtime.addTarget(s1);

    adapter.syncStage(runtime.getStageSnapshot());
    const displayObj = adapter.displayObjects.get('s1')!;
    expect(adapter.targetContainer!.children).toContain(displayObj);

    // Sync with empty list (sweeps s1)
    adapter.syncStage([]);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Runtime Diagnostics] orphan renderer entries')
    );

    // Verify s1 is removed and destroyed
    expect(adapter.displayObjects.has('s1')).toBe(false);
    expect(adapter.targetContainer!.children).not.toContain(displayObj);

    warnSpy.mockRestore();
  });

  // 8. incremental update safety
  it('8. should update existing display objects and preserve container reference identities', () => {
    const s1 = makeSprite({ id: 's1', x: 10 });
    runtime.addTarget(s1);

    adapter.syncStage(runtime.getStageSnapshot());
    const initialRef = adapter.displayObjects.get('s1')!;

    // Trigger position change
    s1.x = 80;
    adapter.syncStage(runtime.getStageSnapshot());

    const updatedRef = adapter.displayObjects.get('s1')!;
    expect(updatedRef).toBe(initialRef); // Identity preserved
    expect(updatedRef.x).toBe(80 + 240);
  });

  // 9. renderer isolation
  it('9. should guarantee renderer operations do not mutate VM target states', () => {
    const s1 = makeSprite({ id: 's1', x: 0 });
    runtime.addTarget(s1);

    adapter.syncStage(runtime.getStageSnapshot());
    const displayObj = adapter.displayObjects.get('s1')!;

    // Mutate Pixi coordinates directly in adapter context
    displayObj.x = 999;
    expect(s1.x).toBe(0); // VM state is unaffected
  });

  // 10. bubble placeholder synchronization
  it('10. should synchronize, draw and clear say/think speech bubbles', () => {
    const s1 = makeSprite({ id: 's1' });
    s1.sayBubble = { text: 'Hello!' };
    runtime.addTarget(s1);

    adapter.syncStage(runtime.getStageSnapshot());
    const displayObj = adapter.displayObjects.get('s1')!;

    // Verify custom properties tracked bubble text
    expect((displayObj as any).activeBubbleText).toBe('Hello!');
    expect((displayObj as any).activeBubbleType).toBe('say');

    const bubbleContainer = (displayObj as any).bubbleContainer as Container;
    expect(bubbleContainer.children.length).toBe(2); // Bg + Text

    const textChild = bubbleContainer.children.find(c => c instanceof Text) as Text;
    expect(textChild).toBeDefined();
    expect(textChild.text).toBe('Hello!');

    // Clear bubble
    s1.sayBubble = undefined;
    adapter.syncStage(runtime.getStageSnapshot());

    expect((displayObj as any).activeBubbleText).toBeUndefined();
    expect(bubbleContainer.children.length).toBe(0); // Children destroyed
  });

  // 11. deterministic clone ordering
  it('11. should preserve clone layer stability stack directly above parent sprite', () => {
    const stage = makeSprite({ id: 'stage', isStage: true } as any);
    const s1 = makeSprite({ id: 's1' });
    const s2 = makeSprite({ id: 's2' });

    runtime.addTarget(stage);
    runtime.addTarget(s1);
    runtime.addTarget(s2);

    runtime.start();
    runtime.createCloneOf('s1');

    adapter.syncStage(runtime.getStageSnapshot());

    // Sequence check: Stage -> s1 -> s1_clone -> s2
    expect(adapter.targetContainer!.children[0].x).toBe(0 + 240); // stage
    const child1Id = Array.from(adapter.displayObjects.entries()).find(([_, v]) => v === adapter.targetContainer!.children[1])![0];
    const child2Id = Array.from(adapter.displayObjects.entries()).find(([_, v]) => v === adapter.targetContainer!.children[2])![0];
    const child3Id = Array.from(adapter.displayObjects.entries()).find(([_, v]) => v === adapter.targetContainer!.children[3])![0];

    expect(child1Id).toBe('s1');
    expect(child2Id.startsWith('s1_clone_')).toBe(true);
    expect(child3Id).toBe('s2');

    runtime.stop();
  });

  // 12. snapshot updates after broadcasts
  it('12. should synchronize Pixi state correctly following a stepped broadcast script', () => {
    const blocks = [
      makeBlock({
        id: 'hat',
        opcode: 'event_whenbroadcastreceived',
        topLevel: true,
        fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'go' } },
        next: 'moveto'
      }),
      makeBlock({ id: 'moveto', opcode: 'motion_gotoxy', inputs: { X: { name: 'X', value: 100 }, Y: { name: 'Y', value: -100 } } })
    ];

    const s1 = makeSprite({ id: 's1', scripts: [makeScript('event_whenbroadcastreceived', blocks)] });
    runtime.addTarget(s1);

    runtime.start();
    runtime.triggerBroadcast('go');

    // Run execution ticks
    runtime.stepOnce();
    runtime.stepOnce();

    adapter.syncStage(runtime.getStageSnapshot());

    const displayObj = adapter.displayObjects.get('s1')!;
    expect(displayObj.x).toBe(100 + 240);
    expect(displayObj.y).toBe(180 - (-100));

    runtime.stop();
  });
});
