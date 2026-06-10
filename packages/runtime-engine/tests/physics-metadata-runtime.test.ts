import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { InMemoryRendererAdapter } from '../src/stage/renderer-adapter';
import { SpriteState, StageState, ASTBlock, ASTScript, VelocityState, AccelerationState, CollisionBounds, ConstraintState } from '../src/types';
import { resetThreadCounter } from '../src/runtime/execution-context';

function makeBlock(id: string, opcode: string, next: string | null = null, inputs: Record<string, any> = {}, fields: Record<string, any> = {}): ASTBlock {
  return { id, opcode, next, inputs: Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, { name: k, value: v }])), fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { name: k, value: v }])), shadow: false, topLevel: false };
}

function makeScript(hatOpcode: string, blocks: ASTBlock[]): ASTScript {
  return { id: 'script_' + (blocks[0]?.id || 'none'), hatOpcode, topBlockId: blocks[0]?.id || 'none', blocks: Object.fromEntries(blocks.map(b => [b.id, b])) };
}

function makeSprite(id: string, name: string, scripts: ASTScript[] = [], overrides: Partial<SpriteState> = {}): SpriteState {
  return { id, name, isStage: false, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts, x: 0, y: 0, direction: 90, visible: true, size: 100, draggable: false, rotationStyle: 'all around', ...overrides };
}

function makeStage(scripts: ASTScript[] = [], overrides: Partial<StageState> = {}): StageState {
  return { id: 'stage', name: 'Stage', isStage: true, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts, tempo: 60, videoState: 'off', ...overrides };
}

async function createRuntime(): Promise<BaseRuntime> {
  const rt = new BaseRuntime();
  await rt.initialize();
  resetThreadCounter();
  return rt;
}

describe('Phase 7P: Runtime Constraint & Physics Metadata Foundation', () => {

  // ── 1. Velocity Initialization ──────────────────────────────────

  it('initializes velocity to {vx:0, vy:0} when target is added', async () => {
    const rt = await createRuntime();
    const sprite = makeSprite('s1', 'Sprite1');
    rt.addTarget(sprite);
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.velocity).toBeDefined();
    expect(target.velocity!.vx).toBe(0);
    expect(target.velocity!.vy).toBe(0);
  });

  it('preserves existing velocity when target is added', async () => {
    const rt = await createRuntime();
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 5, vy: -3 };
    rt.addTarget(sprite);
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.velocity!.vx).toBe(5);
    expect(target.velocity!.vy).toBe(-3);
  });

  it('does not initialize velocity on stage target', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const target = rt.getTargetById('stage') as StageState;
    expect(target.velocity).toBeDefined();
    expect(target.velocity!.vx).toBe(0);
    expect(target.velocity!.vy).toBe(0);
  });

  // ── 2. Acceleration Initialization ──────────────────────────────

  it('initializes acceleration to {ax:0, ay:0} when target is added', async () => {
    const rt = await createRuntime();
    const sprite = makeSprite('s1', 'Sprite1');
    rt.addTarget(sprite);
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.acceleration).toBeDefined();
    expect(target.acceleration!.ax).toBe(0);
    expect(target.acceleration!.ay).toBe(0);
  });

  it('preserves existing acceleration when target is added', async () => {
    const rt = await createRuntime();
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.acceleration = { ax: 2, ay: -1 };
    rt.addTarget(sprite);
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.acceleration!.ax).toBe(2);
    expect(target.acceleration!.ay).toBe(-1);
  });

  // ── 3. Collision Bounds Initialization ──────────────────────────

  it('initializes collisionBounds to {width:0, height:0} when target is added', async () => {
    const rt = await createRuntime();
    const sprite = makeSprite('s1', 'Sprite1');
    rt.addTarget(sprite);
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.collisionBounds).toBeDefined();
    expect(target.collisionBounds!.width).toBe(0);
    expect(target.collisionBounds!.height).toBe(0);
  });

  it('preserves existing collisionBounds when target is added', async () => {
    const rt = await createRuntime();
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.collisionBounds = { width: 50, height: 75 };
    rt.addTarget(sprite);
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.collisionBounds!.width).toBe(50);
    expect(target.collisionBounds!.height).toBe(75);
  });

  // ── 4. Constraints Initialization ───────────────────────────────

  it('initializes constraints to empty object when target is added', async () => {
    const rt = await createRuntime();
    const sprite = makeSprite('s1', 'Sprite1');
    rt.addTarget(sprite);
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.constraints).toBeDefined();
    expect(target.constraints!.lockedX).toBeUndefined();
    expect(target.constraints!.lockedY).toBeUndefined();
    expect(target.constraints!.lockedRotation).toBeUndefined();
  });

  it('preserves existing constraints when target is added', async () => {
    const rt = await createRuntime();
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.constraints = { lockedX: true, lockedY: false, lockedRotation: true };
    rt.addTarget(sprite);
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.constraints!.lockedX).toBe(true);
    expect(target.constraints!.lockedY).toBe(false);
    expect(target.constraints!.lockedRotation).toBe(true);
  });

  // ── 5. Clone Inheritance ────────────────────────────────────────

  it('clone inherits velocity from source', async () => {
    const rt = await createRuntime();
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 10, vy: 20 };
    rt.addTarget(sprite);
    rt.createCloneOf('s1');
    const clones = rt.getTargets().filter(t => t.isClone);
    expect(clones.length).toBe(1);
    expect(clones[0].velocity!.vx).toBe(10);
    expect(clones[0].velocity!.vy).toBe(20);
  });

  it('clone inherits acceleration from source', async () => {
    const rt = await createRuntime();
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.acceleration = { ax: 3, ay: -2 };
    rt.addTarget(sprite);
    rt.createCloneOf('s1');
    const clones = rt.getTargets().filter(t => t.isClone);
    expect(clones[0].acceleration!.ax).toBe(3);
    expect(clones[0].acceleration!.ay).toBe(-2);
  });

  it('clone inherits collisionBounds from source', async () => {
    const rt = await createRuntime();
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.collisionBounds = { width: 40, height: 60 };
    rt.addTarget(sprite);
    rt.createCloneOf('s1');
    const clones = rt.getTargets().filter(t => t.isClone);
    expect(clones[0].collisionBounds!.width).toBe(40);
    expect(clones[0].collisionBounds!.height).toBe(60);
  });

  it('clone inherits constraints from source', async () => {
    const rt = await createRuntime();
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.constraints = { lockedX: true };
    rt.addTarget(sprite);
    rt.createCloneOf('s1');
    const clones = rt.getTargets().filter(t => t.isClone);
    expect(clones[0].constraints!.lockedX).toBe(true);
  });

  // ── 6. Clone Isolation ──────────────────────────────────────────

  it('clone velocity mutation does not affect source', async () => {
    const rt = await createRuntime();
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 5, vy: 5 };
    rt.addTarget(sprite);
    rt.createCloneOf('s1');
    const clone = rt.getTargets().find(t => t.isClone)!;
    clone.velocity!.vx = 999;
    const source = rt.getTargetById('s1') as SpriteState;
    expect(source.velocity!.vx).toBe(5);
  });

  it('clone acceleration mutation does not affect source', async () => {
    const rt = await createRuntime();
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.acceleration = { ax: 1, ay: 1 };
    rt.addTarget(sprite);
    rt.createCloneOf('s1');
    const clone = rt.getTargets().find(t => t.isClone)!;
    clone.acceleration!.ax = 888;
    const source = rt.getTargetById('s1') as SpriteState;
    expect(source.acceleration!.ax).toBe(1);
  });

  it('clone constraints mutation does not affect source', async () => {
    const rt = await createRuntime();
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.constraints = { lockedX: false };
    rt.addTarget(sprite);
    rt.createCloneOf('s1');
    const clone = rt.getTargets().find(t => t.isClone)!;
    clone.constraints!.lockedX = true;
    const source = rt.getTargetById('s1') as SpriteState;
    expect(source.constraints!.lockedX).toBe(false);
  });

  // ── 7. Import/Export Persistence ────────────────────────────────

  it('exportProject preserves velocity', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 7, vy: -4 };
    rt.addTarget(sprite);
    const proj = rt.exportProject();
    const s1 = proj.targets.find(t => t.id === 's1');
    expect(s1?.velocity).toBeDefined();
    expect(s1!.velocity!.vx).toBe(7);
    expect(s1!.velocity!.vy).toBe(-4);
  });

  it('exportProject preserves acceleration', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.acceleration = { ax: 0.5, ay: 9.8 };
    rt.addTarget(sprite);
    const proj = rt.exportProject();
    const s1 = proj.targets.find(t => t.id === 's1');
    expect(s1?.acceleration).toBeDefined();
    expect(s1!.acceleration!.ax).toBe(0.5);
    expect(s1!.acceleration!.ay).toBe(9.8);
  });

  it('exportProject preserves collisionBounds', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.collisionBounds = { width: 32, height: 48 };
    rt.addTarget(sprite);
    const proj = rt.exportProject();
    const s1 = proj.targets.find(t => t.id === 's1');
    expect(s1?.collisionBounds).toBeDefined();
    expect(s1!.collisionBounds!.width).toBe(32);
    expect(s1!.collisionBounds!.height).toBe(48);
  });

  it('exportProject preserves constraints', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.constraints = { lockedX: true, lockedY: true, lockedRotation: false };
    rt.addTarget(sprite);
    const proj = rt.exportProject();
    const s1 = proj.targets.find(t => t.id === 's1');
    expect(s1?.constraints).toBeDefined();
    expect(s1!.constraints!.lockedX).toBe(true);
    expect(s1!.constraints!.lockedY).toBe(true);
    expect(s1!.constraints!.lockedRotation).toBe(false);
  });

  it('importProject restores velocity', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 12, vy: -8 };
    rt.addTarget(sprite);
    const proj = rt.exportProject();
    await rt.initialize();
    rt.importProject(proj);
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.velocity).toBeDefined();
    expect(target.velocity!.vx).toBe(12);
    expect(target.velocity!.vy).toBe(-8);
  });

  it('importProject restores acceleration', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.acceleration = { ax: 1.5, ay: 2.5 };
    rt.addTarget(sprite);
    const proj = rt.exportProject();
    await rt.initialize();
    rt.importProject(proj);
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.acceleration).toBeDefined();
    expect(target.acceleration!.ax).toBe(1.5);
    expect(target.acceleration!.ay).toBe(2.5);
  });

  it('importProject restores collisionBounds', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.collisionBounds = { width: 100, height: 200 };
    rt.addTarget(sprite);
    const proj = rt.exportProject();
    await rt.initialize();
    rt.importProject(proj);
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.collisionBounds).toBeDefined();
    expect(target.collisionBounds!.width).toBe(100);
    expect(target.collisionBounds!.height).toBe(200);
  });

  it('importProject restores constraints', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.constraints = { lockedX: true, lockedRotation: true };
    rt.addTarget(sprite);
    const proj = rt.exportProject();
    await rt.initialize();
    rt.importProject(proj);
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.constraints).toBeDefined();
    expect(target.constraints!.lockedX).toBe(true);
    expect(target.constraints!.lockedRotation).toBe(true);
  });

  it('exportProject does not serialize transient runtime caches', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 1, vy: 1 };
    rt.addTarget(sprite);
    const proj = rt.exportProject();
    const serialized = JSON.parse(JSON.stringify(proj));
    expect(serialized.targets[1].velocity.vx).toBe(1);
  });

  // ── 8. Snapshot Isolation ───────────────────────────────────────

  it('getStageSnapshot includes velocity with deep copy', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 3, vy: 6 };
    rt.addTarget(sprite);
    const snap = rt.getStageSnapshot();
    const s1Snap = snap.find(s => s.targetId === 's1');
    expect(s1Snap?.velocity).toBeDefined();
    expect(s1Snap!.velocity!.vx).toBe(3);
    expect(s1Snap!.velocity!.vy).toBe(6);
  });

  it('snapshot velocity is deep-copied and does not share references', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 10, vy: 20 };
    rt.addTarget(sprite);
    const snap = rt.getStageSnapshot();
    snap.find(s => s.targetId === 's1')!.velocity!.vx = 999;
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.velocity!.vx).toBe(10);
  });

  it('getStageSnapshot includes acceleration with deep copy', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.acceleration = { ax: 2, ay: 4 };
    rt.addTarget(sprite);
    const snap = rt.getStageSnapshot();
    const s1Snap = snap.find(s => s.targetId === 's1');
    expect(s1Snap?.acceleration).toBeDefined();
    expect(s1Snap!.acceleration!.ax).toBe(2);
    expect(s1Snap!.acceleration!.ay).toBe(4);
  });

  it('snapshot acceleration is deep-copied', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.acceleration = { ax: 5, ay: 5 };
    rt.addTarget(sprite);
    const snap = rt.getStageSnapshot();
    snap.find(s => s.targetId === 's1')!.acceleration!.ax = 777;
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.acceleration!.ax).toBe(5);
  });

  it('getStageSnapshot includes collisionBounds with deep copy', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.collisionBounds = { width: 50, height: 80 };
    rt.addTarget(sprite);
    const snap = rt.getStageSnapshot();
    const s1Snap = snap.find(s => s.targetId === 's1');
    expect(s1Snap?.collisionBounds).toBeDefined();
    expect(s1Snap!.collisionBounds!.width).toBe(50);
    expect(s1Snap!.collisionBounds!.height).toBe(80);
  });

  it('snapshot collisionBounds is deep-copied', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.collisionBounds = { width: 30, height: 30 };
    rt.addTarget(sprite);
    const snap = rt.getStageSnapshot();
    snap.find(s => s.targetId === 's1')!.collisionBounds!.width = 9999;
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.collisionBounds!.width).toBe(30);
  });

  it('getStageSnapshot includes constraints with deep copy', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.constraints = { lockedX: true };
    rt.addTarget(sprite);
    const snap = rt.getStageSnapshot();
    const s1Snap = snap.find(s => s.targetId === 's1');
    expect(s1Snap?.constraints).toBeDefined();
    expect(s1Snap!.constraints!.lockedX).toBe(true);
  });

  it('snapshot constraints is deep-copied', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.constraints = { lockedX: false };
    rt.addTarget(sprite);
    const snap = rt.getStageSnapshot();
    snap.find(s => s.targetId === 's1')!.constraints!.lockedX = true;
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.constraints!.lockedX).toBe(false);
  });

  // ── 9. Renderer Synchronization ────────────────────────────────

  it('InMemoryRendererAdapter syncs velocity metadata', async () => {
    const rt = await createRuntime();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 15, vy: 25 };
    rt.addTarget(sprite);
    const snap = rt.getStageSnapshot();
    adapter.syncStage(snap);
    const renderTarget = adapter.targets.get('s1');
    expect(renderTarget?.velocity).toBeDefined();
    expect(renderTarget!.velocity!.vx).toBe(15);
    expect(renderTarget!.velocity!.vy).toBe(25);
  });

  it('InMemoryRendererAdapter syncs acceleration metadata', async () => {
    const rt = await createRuntime();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.acceleration = { ax: 0.5, ay: 1.5 };
    rt.addTarget(sprite);
    const snap = rt.getStageSnapshot();
    adapter.syncStage(snap);
    const renderTarget = adapter.targets.get('s1');
    expect(renderTarget?.acceleration).toBeDefined();
    expect(renderTarget!.acceleration!.ax).toBe(0.5);
    expect(renderTarget!.acceleration!.ay).toBe(1.5);
  });

  it('InMemoryRendererAdapter syncs collisionBounds metadata', async () => {
    const rt = await createRuntime();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.collisionBounds = { width: 64, height: 64 };
    rt.addTarget(sprite);
    const snap = rt.getStageSnapshot();
    adapter.syncStage(snap);
    const renderTarget = adapter.targets.get('s1');
    expect(renderTarget?.collisionBounds).toBeDefined();
    expect(renderTarget!.collisionBounds!.width).toBe(64);
    expect(renderTarget!.collisionBounds!.height).toBe(64);
  });

  it('InMemoryRendererAdapter syncs constraints metadata', async () => {
    const rt = await createRuntime();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.constraints = { lockedX: true, lockedY: true };
    rt.addTarget(sprite);
    const snap = rt.getStageSnapshot();
    adapter.syncStage(snap);
    const renderTarget = adapter.targets.get('s1');
    expect(renderTarget?.constraints).toBeDefined();
    expect(renderTarget!.constraints!.lockedX).toBe(true);
    expect(renderTarget!.constraints!.lockedY).toBe(true);
  });

  it('renderer adapter velocity is deep-copied from snapshot', async () => {
    const rt = await createRuntime();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 8, vy: 9 };
    rt.addTarget(sprite);
    const snap = rt.getStageSnapshot();
    adapter.syncStage(snap);
    const renderTarget = adapter.targets.get('s1');
    renderTarget!.velocity!.vx = 0;
    const snapAgain = rt.getStageSnapshot();
    expect(snapAgain.find(s => s.targetId === 's1')!.velocity!.vx).toBe(8);
  });

  // ── 10. Constraint Behavior ─────────────────────────────────────

  it('lockedX prevents x position modification by metadata propagation', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1', [], { x: 50 });
    sprite.velocity = { vx: 10, vy: 0 };
    sprite.constraints = { lockedX: true };
    rt.addTarget(sprite);
    rt.computePhysicsMetadata();
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.x).toBe(50);
  });

  it('lockedY prevents y position modification by metadata propagation', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1', [], { y: 30 });
    sprite.velocity = { vx: 0, vy: 10 };
    sprite.constraints = { lockedY: true };
    rt.addTarget(sprite);
    rt.computePhysicsMetadata();
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.y).toBe(30);
  });

  it('unlocked X allows x position modification by metadata propagation', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1', [], { x: 0 });
    sprite.velocity = { vx: 5, vy: 0 };
    sprite.constraints = { lockedX: false };
    rt.addTarget(sprite);
    rt.computePhysicsMetadata();
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.x).toBe(5);
  });

  it('unlocked Y allows y position modification by metadata propagation', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1', [], { y: 0 });
    sprite.velocity = { vx: 0, vy: 7 };
    sprite.constraints = { lockedY: false };
    rt.addTarget(sprite);
    rt.computePhysicsMetadata();
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.y).toBe(7);
  });

  it('lockedX and lockedY together prevent both position changes', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1', [], { x: 10, y: 20 });
    sprite.velocity = { vx: 100, vy: 200 };
    sprite.constraints = { lockedX: true, lockedY: true };
    rt.addTarget(sprite);
    rt.computePhysicsMetadata();
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.x).toBe(10);
    expect(target.y).toBe(20);
  });

  it('no constraints allows full position modification', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1', [], { x: 0, y: 0 });
    sprite.velocity = { vx: 3, vy: 4 };
    rt.addTarget(sprite);
    rt.computePhysicsMetadata();
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.x).toBe(3);
    expect(target.y).toBe(4);
  });

  // ── 11. Metadata Propagation ────────────────────────────────────

  it('computePhysicsMetadata adds acceleration to velocity', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1', [], { x: 0, y: 0 });
    sprite.velocity = { vx: 10, vy: 20 };
    sprite.acceleration = { ax: 1, ay: 2 };
    rt.addTarget(sprite);
    rt.computePhysicsMetadata();
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.velocity!.vx).toBe(11);
    expect(target.velocity!.vy).toBe(22);
  });

  it('computePhysicsMetadata applies new velocity to position', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1', [], { x: 0, y: 0 });
    sprite.velocity = { vx: 5, vy: 10 };
    sprite.acceleration = { ax: 0, ay: 0 };
    rt.addTarget(sprite);
    rt.computePhysicsMetadata();
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.x).toBe(5);
    expect(target.y).toBe(10);
  });

  it('computePhysicsMetadata is deterministic across multiple calls', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1', [], { x: 0, y: 0 });
    sprite.velocity = { vx: 1, vy: 1 };
    sprite.acceleration = { ax: 1, ay: 1 };
    rt.addTarget(sprite);
    rt.computePhysicsMetadata();
    rt.computePhysicsMetadata();
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.velocity!.vx).toBe(3);
    expect(target.velocity!.vy).toBe(3);
    expect(target.x).toBe(2 + 3);
    expect(target.y).toBe(2 + 3);
  });

  it('computePhysicsMetadata skips stage targets', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    stage.velocity = { vx: 50, vy: 50 };
    rt.addTarget(stage);
    rt.computePhysicsMetadata();
    const target = rt.getTargetById('stage') as StageState;
    expect(target.velocity!.vx).toBe(50);
    expect(target.velocity!.vy).toBe(50);
  });

  it('computePhysicsMetadata with zero velocity and zero acceleration keeps position unchanged', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1', [], { x: 42, y: -17 });
    rt.addTarget(sprite);
    rt.computePhysicsMetadata();
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.x).toBe(42);
    expect(target.y).toBe(-17);
  });

  // ── 12. Deterministic Ordering ─────────────────────────────────

  it('physics metadata propagation order matches target insertion order', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const s1 = makeSprite('s1', 'Sprite1', [], { x: 0, y: 0 });
    s1.velocity = { vx: 1, vy: 0 };
    rt.addTarget(s1);
    const s2 = makeSprite('s2', 'Sprite2', [], { x: 0, y: 0 });
    s2.velocity = { vx: 2, vy: 0 };
    rt.addTarget(s2);
    rt.computePhysicsMetadata();
    const t1 = rt.getTargetById('s1') as SpriteState;
    const t2 = rt.getTargetById('s2') as SpriteState;
    expect(t1.x).toBe(1);
    expect(t2.x).toBe(2);
  });

  // ── 13. Stop Cleanup ────────────────────────────────────────────

  it('stop() clears physics metadata from remaining targets', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 10, vy: 20 };
    sprite.acceleration = { ax: 1, ay: 2 };
    sprite.collisionBounds = { width: 50, height: 50 };
    sprite.constraints = { lockedX: true };
    rt.addTarget(sprite);
    rt.start();
    rt.stop();
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.velocity).toBeUndefined();
    expect(target.acceleration).toBeUndefined();
    expect(target.collisionBounds).toBeUndefined();
    expect(target.constraints).toBeUndefined();
  });

  // ── 14. Initialize Cleanup ─────────────────────────────────────

  it('initialize() resets physics metadata for fresh state', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 99, vy: 99 };
    rt.addTarget(sprite);
    await rt.initialize();
    const targets = rt.getTargets();
    expect(targets.length).toBe(0);
  });

  // ── 15. Malformed Metadata ──────────────────────────────────────

  it('NaN velocity vx produces warning', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: NaN, vy: 0 };
    sprite.acceleration = { ax: 0, ay: 0 };
    rt.addTarget(sprite);
    rt.computePhysicsMetadata();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid velocity values'));
    warnSpy.mockRestore();
  });

  it('NaN velocity vy produces warning', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 0, vy: NaN };
    sprite.acceleration = { ax: 0, ay: 0 };
    rt.addTarget(sprite);
    rt.computePhysicsMetadata();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid velocity values'));
    warnSpy.mockRestore();
  });

  it('Infinity acceleration ax produces warning', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 0, vy: 0 };
    sprite.acceleration = { ax: Infinity, ay: 0 };
    rt.addTarget(sprite);
    rt.computePhysicsMetadata();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid acceleration values'));
    warnSpy.mockRestore();
  });

  it('Infinity acceleration ay produces warning', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 0, vy: 0 };
    sprite.acceleration = { ax: 0, ay: -Infinity };
    rt.addTarget(sprite);
    rt.computePhysicsMetadata();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid acceleration values'));
    warnSpy.mockRestore();
  });

  // ── 16. Warnings-Only Validation ────────────────────────────────

  it('invalid collisionBounds width does not throw', async () => {
    const rt = await createRuntime();
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.collisionBounds = { width: -10, height: 5 };
    expect(() => rt.addTarget(sprite)).not.toThrow();
  });

  it('malformed constraints do not throw', async () => {
    const rt = await createRuntime();
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.constraints = { lockedX: 'yes' as any };
    expect(() => rt.addTarget(sprite)).not.toThrow();
  });

  it('NaN velocity does not throw, only warns', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: NaN, vy: NaN };
    sprite.acceleration = { ax: 0, ay: 0 };
    rt.addTarget(sprite);
    expect(() => rt.computePhysicsMetadata()).not.toThrow();
    warnSpy.mockRestore();
  });

  // ── 17. Deep Copy Guarantees ───────────────────────────────────

  it('exportProject velocity deep copy isolates from runtime mutation', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 5, vy: 5 };
    rt.addTarget(sprite);
    const proj = rt.exportProject();
    (rt.getTargetById('s1') as SpriteState).velocity!.vx = 999;
    const s1 = proj.targets.find(t => t.id === 's1');
    expect(s1!.velocity!.vx).toBe(5);
  });

  it('exportProject constraints deep copy isolates from runtime mutation', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.constraints = { lockedX: false };
    rt.addTarget(sprite);
    const proj = rt.exportProject();
    (rt.getTargetById('s1') as SpriteState).constraints!.lockedX = true;
    const s1 = proj.targets.find(t => t.id === 's1');
    expect(s1!.constraints!.lockedX).toBe(false);
  });

  // ── 18. Camera Compatibility ───────────────────────────────────

  it('physics metadata does not interfere with camera state', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    rt.setCameraPosition(100, 200);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 5, vy: 5 };
    rt.addTarget(sprite);
    rt.computePhysicsMetadata();
    const cam = rt.getCameraState();
    expect(cam.x).toBe(100);
    expect(cam.y).toBe(200);
  });

  it('physics metadata is present in snapshot alongside camera', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    rt.setCameraPosition(50, 75);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 3, vy: 3 };
    rt.addTarget(sprite);
    const snap = rt.getStageSnapshot();
    const stageSnap = snap.find(s => s.targetId === 'stage');
    expect(stageSnap?.camera).toBeDefined();
    expect(stageSnap!.camera!.x).toBe(50);
    const s1Snap = snap.find(s => s.targetId === 's1');
    expect(s1Snap?.velocity).toBeDefined();
    expect(s1Snap!.velocity!.vx).toBe(3);
  });

  // ── 19. Scene Graph Compatibility ──────────────────────────────

  it('physics metadata does not interfere with scene graph hierarchy', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const parent = makeSprite('p1', 'Parent', [], { x: 10, y: 20 });
    parent.velocity = { vx: 1, vy: 1 };
    rt.addTarget(parent);
    const child = makeSprite('c1', 'Child', [], { x: 5, y: 5 });
    child.velocity = { vx: 2, vy: 2 };
    rt.addTarget(child);
    rt.attachTargetToParent('c1', 'p1');
    expect(rt.getParentTargetId('c1')).toBe('p1');
    const childTarget = rt.getTargetById('c1') as SpriteState;
    expect(childTarget.velocity!.vx).toBe(2);
  });

  it('physics metadata is present in snapshot alongside hierarchy', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const parent = makeSprite('p1', 'Parent');
    parent.velocity = { vx: 1, vy: 1 };
    rt.addTarget(parent);
    const child = makeSprite('c1', 'Child');
    child.velocity = { vx: 2, vy: 2 };
    rt.addTarget(child);
    rt.attachTargetToParent('c1', 'p1');
    const snap = rt.getStageSnapshot();
    const childSnap = snap.find(s => s.targetId === 'c1');
    expect(childSnap?.hierarchyParentId).toBe('p1');
    expect(childSnap?.velocity).toBeDefined();
    expect(childSnap!.velocity!.vx).toBe(2);
  });

  // ── 20. Serialization Boundaries ────────────────────────────────

  it('exportProject does not include clone physics metadata (clones excluded)', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 10, vy: 10 };
    rt.addTarget(sprite);
    rt.createCloneOf('s1');
    const proj = rt.exportProject();
    expect(proj.targets.every(t => !t.id.includes('clone'))).toBe(true);
  });

  it('importProject with missing velocity initializes to defaults', async () => {
    const rt = await createRuntime();
    const proj = {
      version: '0.1.0',
      stage: { stageTargetId: 'stage', currentBackdropIndex: 0 },
      targets: [
        { id: 'stage', name: 'Stage', isStage: true },
        { id: 's1', name: 'Sprite1', isStage: false },
      ],
      assets: { costumes: [], backdrops: [], sounds: [] },
      metadata: { exportedAtMs: 0, runtimeVersion: '0.1.0' },
    };
    rt.importProject(proj as any);
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.velocity).toBeDefined();
    expect(target.velocity!.vx).toBe(0);
    expect(target.velocity!.vy).toBe(0);
  });

  it('importProject with missing acceleration initializes to defaults', async () => {
    const rt = await createRuntime();
    const proj = {
      version: '0.1.0',
      stage: { stageTargetId: 'stage', currentBackdropIndex: 0 },
      targets: [
        { id: 'stage', name: 'Stage', isStage: true },
        { id: 's1', name: 'Sprite1', isStage: false },
      ],
      assets: { costumes: [], backdrops: [], sounds: [] },
      metadata: { exportedAtMs: 0, runtimeVersion: '0.1.0' },
    };
    rt.importProject(proj as any);
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.acceleration).toBeDefined();
    expect(target.acceleration!.ax).toBe(0);
    expect(target.acceleration!.ay).toBe(0);
  });

  it('importProject with missing collisionBounds initializes to defaults', async () => {
    const rt = await createRuntime();
    const proj = {
      version: '0.1.0',
      stage: { stageTargetId: 'stage', currentBackdropIndex: 0 },
      targets: [
        { id: 'stage', name: 'Stage', isStage: true },
        { id: 's1', name: 'Sprite1', isStage: false },
      ],
      assets: { costumes: [], backdrops: [], sounds: [] },
      metadata: { exportedAtMs: 0, runtimeVersion: '0.1.0' },
    };
    rt.importProject(proj as any);
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.collisionBounds).toBeDefined();
    expect(target.collisionBounds!.width).toBe(0);
    expect(target.collisionBounds!.height).toBe(0);
  });

  it('importProject with missing constraints initializes to defaults', async () => {
    const rt = await createRuntime();
    const proj = {
      version: '0.1.0',
      stage: { stageTargetId: 'stage', currentBackdropIndex: 0 },
      targets: [
        { id: 'stage', name: 'Stage', isStage: true },
        { id: 's1', name: 'Sprite1', isStage: false },
      ],
      assets: { costumes: [], backdrops: [], sounds: [] },
      metadata: { exportedAtMs: 0, runtimeVersion: '0.1.0' },
    };
    rt.importProject(proj as any);
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.constraints).toBeDefined();
    expect(target.constraints!.lockedX).toBeUndefined();
  });

  // ── 21. Renderer Adapter Deep Copy ─────────────────────────────

  it('InMemoryRendererAdapter physics metadata is independent from snapshot', async () => {
    const rt = await createRuntime();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 10, vy: 20 };
    sprite.acceleration = { ax: 1, ay: 2 };
    sprite.collisionBounds = { width: 40, height: 50 };
    sprite.constraints = { lockedX: true };
    rt.addTarget(sprite);
    const snap = rt.getStageSnapshot();
    adapter.syncStage(snap);
    const renderTarget = adapter.targets.get('s1')!;
    expect(renderTarget.velocity!.vx).toBe(10);
    expect(renderTarget.acceleration!.ax).toBe(1);
    expect(renderTarget.collisionBounds!.width).toBe(40);
    expect(renderTarget.constraints!.lockedX).toBe(true);
  });

  it('InMemoryRendererAdapter incremental update syncs physics metadata changes', async () => {
    const rt = await createRuntime();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 5, vy: 5 };
    rt.addTarget(sprite);
    adapter.syncStage(rt.getStageSnapshot());
    const target = rt.getTargetById('s1') as SpriteState;
    target.velocity = { vx: 15, vy: 25 };
    adapter.syncStage(rt.getStageSnapshot());
    const renderTarget = adapter.targets.get('s1')!;
    expect(renderTarget.velocity!.vx).toBe(15);
    expect(renderTarget.velocity!.vy).toBe(25);
  });

  // ── 22. Multiple Targets Propagation ───────────────────────────

  it('computePhysicsMetadata processes all non-stage targets', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const s1 = makeSprite('s1', 'Sprite1', [], { x: 0, y: 0 });
    s1.velocity = { vx: 1, vy: 0 };
    s1.acceleration = { ax: 0, ay: 0 };
    rt.addTarget(s1);
    const s2 = makeSprite('s2', 'Sprite2', [], { x: 0, y: 0 });
    s2.velocity = { vx: 0, vy: 1 };
    s2.acceleration = { ax: 0, ay: 0 };
    rt.addTarget(s2);
    rt.computePhysicsMetadata();
    const t1 = rt.getTargetById('s1') as SpriteState;
    const t2 = rt.getTargetById('s2') as SpriteState;
    expect(t1.x).toBe(1);
    expect(t1.y).toBe(0);
    expect(t2.x).toBe(0);
    expect(t2.y).toBe(1);
  });

  it('computePhysicsMetadata with acceleration on multiple targets', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const s1 = makeSprite('s1', 'Sprite1', [], { x: 0, y: 0 });
    s1.velocity = { vx: 0, vy: 0 };
    s1.acceleration = { ax: 1, ay: 0 };
    rt.addTarget(s1);
    const s2 = makeSprite('s2', 'Sprite2', [], { x: 0, y: 0 });
    s2.velocity = { vx: 0, vy: 0 };
    s2.acceleration = { ax: 0, ay: 1 };
    rt.addTarget(s2);
    rt.computePhysicsMetadata();
    const t1 = rt.getTargetById('s1') as SpriteState;
    const t2 = rt.getTargetById('s2') as SpriteState;
    expect(t1.velocity!.vx).toBe(1);
    expect(t1.x).toBe(1);
    expect(t2.velocity!.vy).toBe(1);
    expect(t2.y).toBe(1);
  });

  // ── 23. Collision Bounds Metadata Only ─────────────────────────

  it('collisionBounds stores width and height only', async () => {
    const rt = await createRuntime();
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.collisionBounds = { width: 100, height: 200 };
    rt.addTarget(sprite);
    const target = rt.getTargetById('s1') as SpriteState;
    expect(Object.keys(target.collisionBounds!)).toEqual(['width', 'height']);
  });

  it('collisionBounds does not perform collision detection', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const s1 = makeSprite('s1', 'Sprite1', [], { x: 0, y: 0 });
    s1.collisionBounds = { width: 50, height: 50 };
    rt.addTarget(s1);
    const s2 = makeSprite('s2', 'Sprite2', [], { x: 1, y: 1 });
    s2.collisionBounds = { width: 50, height: 50 };
    rt.addTarget(s2);
    rt.computePhysicsMetadata();
    expect(() => rt.computePhysicsMetadata()).not.toThrow();
  });

  // ── 24. Negative Values ─────────────────────────────────────────

  it('negative velocity values propagate correctly', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1', [], { x: 50, y: 50 });
    sprite.velocity = { vx: -5, vy: -10 };
    sprite.acceleration = { ax: 0, ay: 0 };
    rt.addTarget(sprite);
    rt.computePhysicsMetadata();
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.x).toBe(45);
    expect(target.y).toBe(40);
  });

  it('negative acceleration values propagate correctly', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1', [], { x: 0, y: 0 });
    sprite.velocity = { vx: 10, vy: 10 };
    sprite.acceleration = { ax: -2, ay: -3 };
    rt.addTarget(sprite);
    rt.computePhysicsMetadata();
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.velocity!.vx).toBe(8);
    expect(target.velocity!.vy).toBe(7);
  });

  // ── 25. Fractional Values ──────────────────────────────────────

  it('fractional velocity values propagate correctly', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1', [], { x: 0, y: 0 });
    sprite.velocity = { vx: 0.5, vy: 0.25 };
    sprite.acceleration = { ax: 0, ay: 0 };
    rt.addTarget(sprite);
    rt.computePhysicsMetadata();
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.x).toBeCloseTo(0.5);
    expect(target.y).toBeCloseTo(0.25);
  });

  it('fractional acceleration accumulates correctly', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1', [], { x: 0, y: 0 });
    sprite.velocity = { vx: 0, vy: 0 };
    sprite.acceleration = { ax: 0.1, ay: 0.1 };
    rt.addTarget(sprite);
    rt.computePhysicsMetadata();
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.velocity!.vx).toBeCloseTo(0.1);
    expect(target.velocity!.vy).toBeCloseTo(0.1);
  });

  // ── 26. lockedRotation Constraint ──────────────────────────────

  it('lockedRotation constraint is stored and serialized', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.constraints = { lockedRotation: true };
    rt.addTarget(sprite);
    const proj = rt.exportProject();
    const s1 = proj.targets.find(t => t.id === 's1');
    expect(s1!.constraints!.lockedRotation).toBe(true);
  });

  it('lockedRotation constraint survives import/export', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.constraints = { lockedRotation: true };
    rt.addTarget(sprite);
    const proj = rt.exportProject();
    await rt.initialize();
    rt.importProject(proj);
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.constraints!.lockedRotation).toBe(true);
  });

  // ── 27. Snapshot with Default Physics ─────────────────────────

  it('snapshot includes default velocity for newly added sprite', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    rt.addTarget(sprite);
    const snap = rt.getStageSnapshot();
    const s1Snap = snap.find(s => s.targetId === 's1');
    expect(s1Snap?.velocity).toBeDefined();
    expect(s1Snap!.velocity!.vx).toBe(0);
    expect(s1Snap!.velocity!.vy).toBe(0);
  });

  it('snapshot includes default acceleration for newly added sprite', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    rt.addTarget(sprite);
    const snap = rt.getStageSnapshot();
    const s1Snap = snap.find(s => s.targetId === 's1');
    expect(s1Snap?.acceleration).toBeDefined();
    expect(s1Snap!.acceleration!.ax).toBe(0);
    expect(s1Snap!.acceleration!.ay).toBe(0);
  });

  it('snapshot includes default collisionBounds for newly added sprite', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    rt.addTarget(sprite);
    const snap = rt.getStageSnapshot();
    const s1Snap = snap.find(s => s.targetId === 's1');
    expect(s1Snap?.collisionBounds).toBeDefined();
    expect(s1Snap!.collisionBounds!.width).toBe(0);
    expect(s1Snap!.collisionBounds!.height).toBe(0);
  });

  it('snapshot includes default constraints for newly added sprite', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    rt.addTarget(sprite);
    const snap = rt.getStageSnapshot();
    const s1Snap = snap.find(s => s.targetId === 's1');
    expect(s1Snap?.constraints).toBeDefined();
    expect(s1Snap!.constraints!.lockedX).toBeUndefined();
  });

  // ── 28. Renderer Adapter Orphan Cleanup ────────────────────────

  it('renderer adapter cleans up physics metadata for removed targets', async () => {
    const rt = await createRuntime();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 5, vy: 5 };
    rt.addTarget(sprite);
    adapter.syncStage(rt.getStageSnapshot());
    expect(adapter.targets.has('s1')).toBe(true);
    rt.removeTarget('s1');
    adapter.syncStage(rt.getStageSnapshot());
    expect(adapter.targets.has('s1')).toBe(false);
  });

  // ── 29. Full Round-Trip ────────────────────────────────────────

  it('full round-trip: add -> export -> import -> verify physics metadata', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1', [], { x: 10, y: 20 });
    sprite.velocity = { vx: 3, vy: 4 };
    sprite.acceleration = { ax: 0.5, ay: -0.5 };
    sprite.collisionBounds = { width: 25, height: 35 };
    sprite.constraints = { lockedX: false, lockedY: true, lockedRotation: true };
    rt.addTarget(sprite);
    const proj = rt.exportProject();
    await rt.initialize();
    rt.importProject(proj);
    const target = rt.getTargetById('s1') as SpriteState;
    expect(target.velocity!.vx).toBe(3);
    expect(target.velocity!.vy).toBe(4);
    expect(target.acceleration!.ax).toBe(0.5);
    expect(target.acceleration!.ay).toBe(-0.5);
    expect(target.collisionBounds!.width).toBe(25);
    expect(target.collisionBounds!.height).toBe(35);
    expect(target.constraints!.lockedX).toBe(false);
    expect(target.constraints!.lockedY).toBe(true);
    expect(target.constraints!.lockedRotation).toBe(true);
  });

  it('full round-trip: clone -> export -> import -> verify metadata', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const sprite = makeSprite('s1', 'Sprite1');
    sprite.velocity = { vx: 7, vy: 8 };
    rt.addTarget(sprite);
    rt.createCloneOf('s1');
    const proj = rt.exportProject();
    expect(proj.targets.find(t => t.id === 's1')!.velocity!.vx).toBe(7);
  });

  // ── 30. Type Safety ────────────────────────────────────────────

  it('VelocityState type is serializable', () => {
    const v: VelocityState = { vx: 1, vy: 2 };
    const json = JSON.parse(JSON.stringify(v));
    expect(json.vx).toBe(1);
    expect(json.vy).toBe(2);
  });

  it('AccelerationState type is serializable', () => {
    const a: AccelerationState = { ax: 3, ay: 4 };
    const json = JSON.parse(JSON.stringify(a));
    expect(json.ax).toBe(3);
    expect(json.ay).toBe(4);
  });

  it('CollisionBounds type is serializable', () => {
    const c: CollisionBounds = { width: 50, height: 60 };
    const json = JSON.parse(JSON.stringify(c));
    expect(json.width).toBe(50);
    expect(json.height).toBe(60);
  });

  it('ConstraintState type is serializable', () => {
    const c: ConstraintState = { lockedX: true, lockedY: false, lockedRotation: true };
    const json = JSON.parse(JSON.stringify(c));
    expect(json.lockedX).toBe(true);
    expect(json.lockedY).toBe(false);
    expect(json.lockedRotation).toBe(true);
  });

  it('ConstraintState with undefined fields is serializable', () => {
    const c: ConstraintState = {};
    const json = JSON.parse(JSON.stringify(c));
    expect(json.lockedX).toBeUndefined();
    expect(json.lockedY).toBeUndefined();
    expect(json.lockedRotation).toBeUndefined();
  });
});
