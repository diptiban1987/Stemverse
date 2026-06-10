import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { InMemoryRendererAdapter } from '../src/stage/renderer-adapter';
import { SpriteState, StageState, ASTBlock, ASTScript } from '../src/types';
import { resetThreadCounter } from '../src/runtime/execution-context';

function makeBlock(id: string, opcode: string, next: string | null = null, inputs: Record<string, any> = {}, fields: Record<string, any> = {}): ASTBlock {
  return { id, opcode, next, inputs: Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, { name: k, value: v }])), fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { name: k, value: v }])), shadow: false, topLevel: false };
}

function makeScript(hatOpcode: string, blocks: ASTBlock[]): ASTScript {
  return { id: `script_${blocks[0]?.id}`, hatOpcode, topBlockId: blocks[0]?.id || 'none', blocks: Object.fromEntries(blocks.map(b => [b.id, b])) };
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

describe('Phase 7N: Runtime Scene Graph & Transform Hierarchy Foundation', () => {

  // ── 1. Parent Attachment ─────────────────────────────────────────

  it('attachTargetToParent creates parent-child relationship', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Parent'));
    rt.addTarget(makeSprite('s2', 'Child'));
    rt.attachTargetToParent('s2', 's1');
    expect(rt.getParentTargetId('s2')).toBe('s1');
    expect(rt.getChildTargetIds('s1')).toContain('s2');
  });

  it('attachTargetToParent sets childTargetIds on parent', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Parent'));
    rt.addTarget(makeSprite('s2', 'Child'));
    rt.attachTargetToParent('s2', 's1');
    const parent = rt.getTargetById('s1');
    expect(parent!.childTargetIds).toBeDefined();
    expect(parent!.childTargetIds).toContain('s2');
  });

  // ── 2. Parent Detachment ──────────────────────────────────────────

  it('detachTargetFromParent removes parent-child relationship', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Parent'));
    rt.addTarget(makeSprite('s2', 'Child'));
    rt.attachTargetToParent('s2', 's1');
    rt.detachTargetFromParent('s2');
    expect(rt.getParentTargetId('s2')).toBeUndefined();
    expect(rt.getChildTargetIds('s1')).not.toContain('s2');
  });

  it('detachTargetFromParent cleans up childTargetIds on parent', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Parent'));
    rt.addTarget(makeSprite('s2', 'Child'));
    rt.attachTargetToParent('s2', 's1');
    rt.detachTargetFromParent('s2');
    const parent = rt.getTargetById('s1');
    expect(parent!.childTargetIds).toBeUndefined();
  });

  // ── 3. Child Ordering ────────────────────────────────────────────

  it('getChildTargetIds returns children in insertion order', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Parent'));
    rt.addTarget(makeSprite('s2', 'Child1'));
    rt.addTarget(makeSprite('s3', 'Child2'));
    rt.attachTargetToParent('s2', 's1');
    rt.attachTargetToParent('s3', 's1');
    const children = rt.getChildTargetIds('s1');
    expect(children[0]).toBe('s2');
    expect(children[1]).toBe('s3');
  });

  // ── 4. Local Transform Initialization ─────────────────────────────

  it('addTarget initializes localTransform for sprites', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', [], { x: 10, y: 20, direction: 45, size: 80 }));
    const target = rt.getTargetById('s1');
    expect(target!.localTransform).toBeDefined();
    expect(target!.localTransform!.x).toBe(10);
    expect(target!.localTransform!.y).toBe(20);
    expect(target!.localTransform!.direction).toBe(45);
    expect(target!.localTransform!.size).toBe(80);
  });

  it('addTarget initializes worldTransform for sprites', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', [], { x: 50, y: -30 }));
    const target = rt.getTargetById('s1');
    expect(target!.worldTransform).toBeDefined();
    expect(target!.worldTransform!.worldX).toBe(50);
    expect(target!.worldTransform!.worldY).toBe(-30);
  });

  // ── 5. World Transform Propagation ────────────────────────────────

  it('world transform = parent world + local transform', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('parent', 'Parent', [], { x: 100, y: 50 }));
    rt.addTarget(makeSprite('child', 'Child', [], { x: 10, y: 20 }));
    rt.attachTargetToParent('child', 'parent');
    const child = rt.getTargetById('child');
    expect(child!.worldTransform!.worldX).toBe(110);
    expect(child!.worldTransform!.worldY).toBe(70);
  });

  // ── 6. Nested Hierarchy Propagation ───────────────────────────────

  it('nested hierarchy propagates transforms correctly', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('g', 'Grandparent', [], { x: 100, y: 0 }));
    rt.addTarget(makeSprite('p', 'Parent', [], { x: 50, y: 0 }));
    rt.addTarget(makeSprite('c', 'Child', [], { x: 10, y: 0 }));
    rt.attachTargetToParent('p', 'g');
    rt.attachTargetToParent('c', 'p');
    const child = rt.getTargetById('c');
    expect(child!.worldTransform!.worldX).toBe(160);
  });

  // ── 7. Clone Hierarchy Inheritance ─────────────────────────────────

  it('clone inherits local and world transforms', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    const sprite = makeSprite('s1', 'Cat', [], { x: 30, y: 40 });
    rt.addTarget(sprite);
    rt.createCloneOf('s1');
    const clones = rt.getTargets().filter(t => t.isClone);
    expect(clones.length).toBe(1);
    expect(clones[0].localTransform).toBeDefined();
    expect(clones[0].localTransform!.x).toBe(30);
    expect(clones[0].worldTransform).toBeDefined();
    expect(clones[0].worldTransform!.worldX).toBe(30);
  });

  // ── 8. Clone Hierarchy Cleanup ─────────────────────────────────────

  it('clone deletion does not corrupt parent hierarchy', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Parent'));
    rt.addTarget(makeSprite('s2', 'Child'));
    rt.attachTargetToParent('s2', 's1');
    rt.createCloneOf('s2');
    const clone = rt.getTargets().find(t => t.isClone);
    expect(clone).toBeDefined();
    rt.deleteClone(clone!.id);
    expect(rt.getParentTargetId('s2')).toBe('s1');
  });

  // ── 9. Self-Parent Prevention ──────────────────────────────────────

  it('self-parenting warns and is rejected', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat'));
    rt.attachTargetToParent('s1', 's1');
    expect(warnSpy).toHaveBeenCalled();
    expect(rt.getParentTargetId('s1')).toBeUndefined();
    warnSpy.mockRestore();
  });

  // ── 10. Circular Hierarchy Prevention ─────────────────────────────

  it('circular hierarchy warns and is rejected', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    rt.attachTargetToParent('s1', 's2');
    expect(warnSpy).toHaveBeenCalled();
    expect(rt.getParentTargetId('s1')).toBeUndefined();
    warnSpy.mockRestore();
  });

  // ── 11. Malformed Hierarchy Handling ──────────────────────────────

  it('attach with nonexistent child warns', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.attachTargetToParent('nonexistent', 'also_nonexistent');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('attach with empty childId warns', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.attachTargetToParent('', 's1');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // ── 12. Orphan Cleanup ────────────────────────────────────────────

  it('removeTarget cleans up hierarchy for children', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Parent'));
    rt.addTarget(makeSprite('s2', 'Child'));
    rt.attachTargetToParent('s2', 's1');
    rt.removeTarget('s2');
    const parent = rt.getTargetById('s1');
    expect(parent!.childTargetIds).toBeUndefined();
  });

  // ── 13. Deterministic Hierarchy Ordering ──────────────────────────

  it('getTransformHierarchy returns deterministic order', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    const hierarchy = rt.getTransformHierarchy();
    const s1Entry = hierarchy.find(h => h.targetId === 's1');
    expect(s1Entry).toBeDefined();
    expect(s1Entry!.childTargetIds).toContain('s2');
  });

  // ── 14. Snapshot Immutability ─────────────────────────────────────

  it('mutating snapshot transformHierarchy does not affect runtime', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    const snap = rt.getStageSnapshot();
    const stageSnap = snap.find(s => s.targetId === 'stage');
    if (stageSnap!.transformHierarchy) {
      stageSnap!.transformHierarchy[0].childTargetIds.push('fake');
    }
    const hierarchy = rt.getTransformHierarchy();
    const s1Entry = hierarchy.find(h => h.targetId === 's1');
    expect(s1Entry!.childTargetIds).not.toContain('fake');
  });

  // ── 15. Runtime-Renderer Isolation ────────────────────────────────

  it('renderer adapter receives hierarchy metadata only', async () => {
    const rt = await createRuntime();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    adapter.syncStage(rt.getStageSnapshot());
    const stage = adapter.targets.get('stage');
    expect(stage!.transformHierarchy).toBeDefined();
  });

  // ── 16. Renderer Synchronization ──────────────────────────────────

  it('InMemoryRendererAdapter syncs localTransform and worldTransform', async () => {
    const rt = await createRuntime();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', [], { x: 10, y: 20 }));
    adapter.syncStage(rt.getStageSnapshot());
    const target = adapter.targets.get('s1');
    expect(target!.localTransform).toBeDefined();
    expect(target!.localTransform!.x).toBe(10);
    expect(target!.worldTransform).toBeDefined();
    expect(target!.worldTransform!.worldX).toBe(10);
  });

  // ── 17. Pixi Metadata Ingestion ──────────────────────────────────

  it('snapshot contains hierarchy metadata for Pixi ingestion', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    const snap = rt.getStageSnapshot();
    const s2Snap = snap.find(s => s.targetId === 's2');
    expect(s2Snap!.localTransform).toBeDefined();
    expect(s2Snap!.worldTransform).toBeDefined();
  });

  // ── 18. Import/Export Hierarchy Persistence ────────────────────────

  it('exportProject preserves hierarchy metadata', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B', [], { x: 10, y: 20 }));
    rt.attachTargetToParent('s2', 's1');
    const exported = rt.exportProject();
    const s2 = exported.targets.find(t => t.id === 's2');
    expect(s2!.parentTargetId).toBe('s1');
    expect(s2!.localTransform).toBeDefined();
    expect(s2!.worldTransform).toBeDefined();
  });

  it('importProject restores hierarchy relationships', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    const exported = rt.exportProject();
    const rt2 = await createRuntime();
    rt2.importProject(exported);
    expect(rt2.getParentTargetId('s2')).toBe('s1');
    expect(rt2.getChildTargetIds('s1')).toContain('s2');
  });

  // ── 19. Hierarchy Replay Safety ───────────────────────────────────

  it('export-import-export produces identical hierarchy', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    const exported1 = rt.exportProject();
    const rt2 = await createRuntime();
    rt2.importProject(exported1);
    const exported2 = rt2.exportProject();
    const s2_a = exported1.targets.find(t => t.id === 's2');
    const s2_b = exported2.targets.find(t => t.id === 's2');
    expect(s2_a!.parentTargetId).toEqual(s2_b!.parentTargetId);
    expect(s2_a!.localTransform).toEqual(s2_b!.localTransform);
    expect(s2_a!.worldTransform).toEqual(s2_b!.worldTransform);
  });

  // ── 20. Centralized Cleanup Preservation ───────────────────────────

  it('stop() clears transform hierarchy', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    rt.stop();
    expect(rt.getTransformHierarchy().length).toBe(0);
  });

  // ── 21. Stop/Reset Cleanup ───────────────────────────────────────

  it('initialize() clears transform hierarchy', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    await rt.initialize();
    expect(rt.getTransformHierarchy().length).toBe(0);
  });

  // ── 22. Target Removal Cleanup ────────────────────────────────────

  it('removing parent orphans children gracefully', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Parent'));
    rt.addTarget(makeSprite('s2', 'Child'));
    rt.attachTargetToParent('s2', 's1');
    rt.removeTarget('s1');
    const child = rt.getTargetById('s2');
    expect(child).toBeDefined();
    expect(child!.parentTargetId).toBeUndefined();
  });

  // ── 23. Attach-After-Clone Safety ──────────────────────────────────

  it('attaching cloned target to parent works correctly', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.createCloneOf('s1');
    const clone = rt.getTargets().find(t => t.isClone);
    expect(clone).toBeDefined();
    rt.attachTargetToParent(clone!.id, 's2');
    expect(rt.getParentTargetId(clone!.id)).toBe('s2');
  });

  // ── 24. Detach-After-Clone Safety ─────────────────────────────────

  it('detaching cloned target from parent works correctly', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.createCloneOf('s1');
    const clone = rt.getTargets().find(t => t.isClone);
    rt.attachTargetToParent(clone!.id, 's2');
    rt.detachTargetFromParent(clone!.id);
    expect(rt.getParentTargetId(clone!.id)).toBeUndefined();
  });

  // ── 25. Hierarchy Rebuild Safety ──────────────────────────────────

  it('re-attaching to different parent updates hierarchy', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.addTarget(makeSprite('s3', 'C'));
    rt.attachTargetToParent('s3', 's1');
    expect(rt.getParentTargetId('s3')).toBe('s1');
    rt.attachTargetToParent('s3', 's2');
    expect(rt.getParentTargetId('s3')).toBe('s2');
    expect(rt.getChildTargetIds('s1')).not.toContain('s3');
    expect(rt.getChildTargetIds('s2')).toContain('s3');
  });

  // ── 26. Imported Hierarchy Restoration ─────────────────────────────

  it('importProject restores local and world transforms', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', [], { x: 42, y: -7, direction: 135, size: 75 }));
    const exported = rt.exportProject();
    const rt2 = await createRuntime();
    rt2.importProject(exported);
    const target = rt2.getTargetById('s1');
    expect(target!.localTransform).toBeDefined();
    expect(target!.localTransform!.x).toBe(42);
    expect(target!.localTransform!.size).toBe(75);
  });

  // ── 27. Deep-Copy Guarantees ──────────────────────────────────────

  it('snapshot worldTransform is a copy, not a reference', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', [], { x: 10, y: 20 }));
    const snap = rt.getStageSnapshot();
    const s1Snap = snap.find(s => s.targetId === 's1');
    const worldBefore = s1Snap!.worldTransform!.worldX;
    s1Snap!.worldTransform!.worldX = 999;
    const target = rt.getTargetById('s1');
    expect(target!.worldTransform!.worldX).toBe(worldBefore);
  });

  // ── 28. No Renderer Ownership ─────────────────────────────────────

  it('hierarchy operations work without renderer adapter', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    expect(rt.getParentTargetId('s2')).toBe('s1');
  });

  // ── 29. Metadata-Only Execution Safety ─────────────────────────────

  it('runtime ticks with hierarchy without error', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    expect(() => rt.stepOnce()).not.toThrow();
  });

  // ── 30. Transform Propagation Determinism ─────────────────────────

  it('same hierarchy produces same world transforms deterministically', async () => {
    const rt1 = await createRuntime();
    rt1.addTarget(makeStage());
    rt1.addTarget(makeSprite('p', 'P', [], { x: 100, y: 50 }));
    rt1.addTarget(makeSprite('c', 'C', [], { x: 10, y: 20 }));
    rt1.attachTargetToParent('c', 'p');
    const rt2 = await createRuntime();
    rt2.addTarget(makeStage());
    rt2.addTarget(makeSprite('p', 'P', [], { x: 100, y: 50 }));
    rt2.addTarget(makeSprite('c', 'C', [], { x: 10, y: 20 }));
    rt2.attachTargetToParent('c', 'p');
    const t1 = rt1.getTargetById('c');
    const t2 = rt2.getTargetById('c');
    expect(t1!.worldTransform).toEqual(t2!.worldTransform);
  });

  // ── 31. Hierarchy Mutation Isolation ───────────────────────────────

  it('mutating child localTransform does not affect parent', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Parent', [], { x: 100 }));
    rt.addTarget(makeSprite('s2', 'Child', [], { x: 10 }));
    rt.attachTargetToParent('s2', 's1');
    const child = rt.getTargetById('s2') as SpriteState;
    child.x = 999;
    const parent = rt.getTargetById('s1');
    expect(parent!.worldTransform!.worldX).toBe(100);
  });

  // ── 32. World Transform Independence ──────────────────────────────

  it('child world transform is independent of parent world transform reference', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Parent', [], { x: 100 }));
    rt.addTarget(makeSprite('s2', 'Child', [], { x: 10 }));
    rt.attachTargetToParent('s2', 's1');
    const parent = rt.getTargetById('s1')!;
    const child = rt.getTargetById('s2')!;
    expect(child.worldTransform!.worldX).toBe(110);
    expect(parent.worldTransform!.worldX).toBe(100);
  });

  // ── 33. Sibling Hierarchy Safety ───────────────────────────────────

  it('siblings under same parent are independent', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('p', 'Parent', [], { x: 100 }));
    rt.addTarget(makeSprite('c1', 'Child1', [], { x: 10 }));
    rt.addTarget(makeSprite('c2', 'Child2', [], { x: 20 }));
    rt.attachTargetToParent('c1', 'p');
    rt.attachTargetToParent('c2', 'p');
    const c1 = rt.getTargetById('c1')!;
    const c2 = rt.getTargetById('c2')!;
    expect(c1.worldTransform!.worldX).toBe(110);
    expect(c2.worldTransform!.worldX).toBe(120);
  });

  // ── 34. Parent Deletion Cleanup ───────────────────────────────────

  it('parent deletion orphans all children', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('p', 'Parent'));
    rt.addTarget(makeSprite('c1', 'Child1'));
    rt.addTarget(makeSprite('c2', 'Child2'));
    rt.attachTargetToParent('c1', 'p');
    rt.attachTargetToParent('c2', 'p');
    rt.removeTarget('p');
    expect(rt.getParentTargetId('c1')).toBeUndefined();
    expect(rt.getParentTargetId('c2')).toBeUndefined();
  });

  // ── 35. Nested Clone Hierarchies ──────────────────────────────────

  it('clone of child in hierarchy has independent world transform', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('p', 'Parent', [], { x: 100 }));
    rt.addTarget(makeSprite('c', 'Child', [], { x: 10 }));
    rt.attachTargetToParent('c', 'p');
    rt.createCloneOf('c');
    const clone = rt.getTargets().find(t => t.isClone);
    expect(clone).toBeDefined();
    expect(clone!.worldTransform!.worldX).toBe(10);
  });

  // ── 36. Hierarchy Ordering After Removal ───────────────────────────

  it('removing middle child preserves sibling order', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('p', 'Parent'));
    rt.addTarget(makeSprite('c1', 'Child1'));
    rt.addTarget(makeSprite('c2', 'Child2'));
    rt.addTarget(makeSprite('c3', 'Child3'));
    rt.attachTargetToParent('c1', 'p');
    rt.attachTargetToParent('c2', 'p');
    rt.attachTargetToParent('c3', 'p');
    rt.removeTarget('c2');
    const children = rt.getChildTargetIds('p');
    expect(children).toEqual(['c1', 'c3']);
  });

  // ── 37. No Async Transform Ownership ────────────────────────────────

  it('hierarchy operations are synchronous', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    expect(rt.getParentTargetId('s2')).toBe('s1');
  });

  // ── 38. No Matrix Dependency ───────────────────────────────────────

  it('world transform is simple addition, no matrix objects', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A', [], { x: 100, y: 50, direction: 90, size: 200 }));
    rt.addTarget(makeSprite('s2', 'B', [], { x: 10, y: 20, direction: 0, size: 50 }));
    rt.attachTargetToParent('s2', 's1');
    const child = rt.getTargetById('s2')!;
    expect(child.worldTransform!.worldX).toBe(110);
    expect(child.worldTransform!.worldY).toBe(70);
    expect(child.worldTransform!.worldDirection).toBe(0);
    expect(child.worldTransform!.worldSize).toBe(100);
  });

  // ── 39. Deterministic Export Ordering ──────────────────────────────

  it('export preserves hierarchy entries in deterministic order', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    const exported = rt.exportProject();
    const s2 = exported.targets.find(t => t.id === 's2');
    expect(s2!.parentTargetId).toBe('s1');
    const s1 = exported.targets.find(t => t.id === 's1');
    expect(s1!.childTargetIds).toContain('s2');
  });

  // ── 40. Imported Snapshot Isolation ────────────────────────────────

  it('mutating exported hierarchy does not affect runtime', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    const exported = rt.exportProject();
    const s1 = exported.targets.find(t => t.id === 's1');
    s1!.childTargetIds = [];
    expect(rt.getChildTargetIds('s1')).toContain('s2');
  });

  // ── 41. Invalid Transform Warnings ─────────────────────────────────

  it('invalid hierarchy operations warn without throwing', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.attachTargetToParent('', '');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('3-level circular hierarchy is prevented', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('a', 'A'));
    rt.addTarget(makeSprite('b', 'B'));
    rt.addTarget(makeSprite('c', 'C'));
    rt.attachTargetToParent('b', 'a');
    rt.attachTargetToParent('c', 'b');
    rt.attachTargetToParent('a', 'c');
    expect(warnSpy).toHaveBeenCalled();
    expect(rt.getParentTargetId('a')).toBeUndefined();
    warnSpy.mockRestore();
  });

  // ── 42. Transform Persistence Boundaries ───────────────────────────

  it('stage targets do not get local/world transforms', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    const stage = rt.getTargetById('stage');
    expect(stage!.localTransform).toBeUndefined();
    expect(stage!.worldTransform).toBeUndefined();
  });

  // ── Additional: hierarchy with size propagation ────────────────────

  it('world size is parent size * local size / 100', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('p', 'Parent', [], { x: 0, y: 0, size: 200 }));
    rt.addTarget(makeSprite('c', 'Child', [], { x: 0, y: 0, size: 50 }));
    rt.attachTargetToParent('c', 'p');
    const child = rt.getTargetById('c')!;
    expect(child.worldTransform!.worldSize).toBe(100);
  });

  // ── Additional: detach non-parented target is safe ─────────────────

  it('detachTargetFromParent on non-parented target is safe', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    expect(() => rt.detachTargetFromParent('s1')).not.toThrow();
  });

  // ── Additional: renderer deep-copy of transform hierarchy ─────────

  it('renderer transformHierarchy mutation does not affect runtime', async () => {
    const rt = await createRuntime();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    adapter.syncStage(rt.getStageSnapshot());
    const stage = adapter.targets.get('stage');
    if (stage!.transformHierarchy && stage!.transformHierarchy.length > 0) {
      stage!.transformHierarchy[0].childTargetIds.push('fake');
    }
    expect(rt.getChildTargetIds('s1')).not.toContain('fake');
  });

  // ── Additional: parentTargetId on TargetState is distinct from clone parentTargetId ──

  it('hierarchy parentTargetId is separate from clone parentTargetId', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    rt.createCloneOf('s1');
    const clone = rt.getTargets().find(t => t.isClone);
    expect(clone!.parentTargetId).toBe('s1');
    expect(clone!.isClone).toBe(true);
    expect(rt.getParentTargetId(clone!.id)).toBeUndefined();
    expect(rt.getParent(clone!.id)).toBeNull();
  });

  // ── Additional: world transform propagation on detach ──────────────

  it('detaching child recomputes world transform', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('p', 'Parent', [], { x: 100 }));
    rt.addTarget(makeSprite('c', 'Child', [], { x: 10 }));
    rt.attachTargetToParent('c', 'p');
    expect(rt.getTargetById('c')!.worldTransform!.worldX).toBe(110);
    rt.detachTargetFromParent('c');
    const child = rt.getTargetById('c')!;
    expect(child.worldTransform!.worldX).toBe(10);
  });

  // ── Additional: hierarchy data in stage snapshot ────────────────────

  it('stage snapshot contains transformHierarchy', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    const snap = rt.getStageSnapshot();
    const stageSnap = snap.find(s => s.targetId === 'stage');
    expect(stageSnap!.transformHierarchy).toBeDefined();
    expect(stageSnap!.transformHierarchy!.length).toBeGreaterThan(0);
  });

  // ── 43. computeWorldTransforms ────────────────────────────────────

  it('computeWorldTransforms recomputes all world transforms', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('p', 'Parent', [], { x: 100, y: 50 }));
    rt.addTarget(makeSprite('c', 'Child', [], { x: 10, y: 20 }));
    rt.attachTargetToParent('c', 'p');
    expect(rt.getTargetById('c')!.worldTransform!.worldX).toBe(110);
    const parent = rt.getTargetById('p') as SpriteState;
    parent.x = 200;
    parent.localTransform!.x = 200;
    rt.computeWorldTransforms();
    expect(rt.getTargetById('c')!.worldTransform!.worldX).toBe(210);
    expect(rt.getTargetById('c')!.worldTransform!.worldY).toBe(70);
  });

  // ── 44. World transform updates after motion ───────────────────────

  it('world transform updates after local motion change', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('p', 'Parent', [], { x: 100 }));
    rt.addTarget(makeSprite('c', 'Child', [], { x: 10 }));
    rt.attachTargetToParent('c', 'p');
    expect(rt.getTargetById('c')!.worldTransform!.worldX).toBe(110);
    const child = rt.getTargetById('c') as SpriteState;
    child.x = 25;
    child.localTransform!.x = 25;
    rt.computeWorldTransforms();
    expect(rt.getTargetById('c')!.worldTransform!.worldX).toBe(125);
  });

  // ── 45. Deep hierarchy stability ──────────────────────────────────

  it('deep hierarchy (5 levels) propagates transforms correctly', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('l0', 'L0', [], { x: 10, y: 0 }));
    rt.addTarget(makeSprite('l1', 'L1', [], { x: 10, y: 0 }));
    rt.addTarget(makeSprite('l2', 'L2', [], { x: 10, y: 0 }));
    rt.addTarget(makeSprite('l3', 'L3', [], { x: 10, y: 0 }));
    rt.addTarget(makeSprite('l4', 'L4', [], { x: 10, y: 0 }));
    rt.attachTargetToParent('l1', 'l0');
    rt.attachTargetToParent('l2', 'l1');
    rt.attachTargetToParent('l3', 'l2');
    rt.attachTargetToParent('l4', 'l3');
    expect(rt.getTargetById('l4')!.worldTransform!.worldX).toBe(50);
  });

  // ── 46. setParent API ─────────────────────────────────────────────

  it('setParent with null detaches from hierarchy', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    expect(rt.getParentTargetId('s2')).toBe('s1');
    rt.setParent('s2', null);
    expect(rt.getParentTargetId('s2')).toBeUndefined();
  });

  // ── 47. getParent API ─────────────────────────────────────────────

  it('getParent returns null for unparented targets', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    expect(rt.getParent('s1')).toBeNull();
  });

  // ── 48. getChildren API ──────────────────────────────────────────

  it('getChildren delegates to getChildTargetIds', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    expect(rt.getChildren('s1')).toEqual(['s2']);
  });

  // ── 49. Snapshot hierarchyParentId field ──────────────────────────

  it('snapshot includes hierarchyParentId for child targets', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    const snap = rt.getStageSnapshot();
    const s2Snap = snap.find(s => s.targetId === 's2');
    expect(s2Snap!.hierarchyParentId).toBe('s1');
  });

  // ── 50. Snapshot hierarchyChildIds field ──────────────────────────

  it('snapshot includes hierarchyChildIds for parent targets', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    const snap = rt.getStageSnapshot();
    const s1Snap = snap.find(s => s.targetId === 's1');
    expect(s1Snap!.hierarchyChildIds).toBeDefined();
    expect(s1Snap!.hierarchyChildIds).toContain('s2');
  });

  // ── 51. Renderer hierarchyParentId ingestion ──────────────────────

  it('renderer adapter ingests hierarchyParentId', async () => {
    const rt = await createRuntime();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    adapter.syncStage(rt.getStageSnapshot());
    const s2Target = adapter.targets.get('s2');
    expect(s2Target!.hierarchyParentId).toBe('s1');
  });

  // ── 52. Renderer hierarchyChildIds ingestion ─────────────────────

  it('renderer adapter ingests hierarchyChildIds', async () => {
    const rt = await createRuntime();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    adapter.syncStage(rt.getStageSnapshot());
    const s1Target = adapter.targets.get('s1');
    expect(s1Target!.hierarchyChildIds).toContain('s2');
  });

  // ── 53. Renderer hierarchy fields are deep-copied ─────────────────

  it('renderer hierarchyChildIds mutation does not affect runtime', async () => {
    const rt = await createRuntime();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    rt.addTarget(makeSprite('s2', 'B'));
    rt.attachTargetToParent('s2', 's1');
    adapter.syncStage(rt.getStageSnapshot());
    const s1Target = adapter.targets.get('s1');
    s1Target!.hierarchyChildIds!.push('fake');
    expect(rt.getChildTargetIds('s1')).not.toContain('fake');
  });

  // ── 54. computeWorldTransforms with no hierarchy ───────────────────

  it('computeWorldTransforms works with no hierarchy', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', [], { x: 42, y: -7 }));
    rt.computeWorldTransforms();
    expect(rt.getTargetById('s1')!.worldTransform!.worldX).toBe(42);
    expect(rt.getTargetById('s1')!.worldTransform!.worldY).toBe(-7);
  });

  // ── 55. Deep hierarchy direction propagation ─────────────────────

  it('deep hierarchy propagates direction correctly', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('p', 'Parent', [], { x: 0, y: 0, direction: 90 }));
    rt.addTarget(makeSprite('c', 'Child', [], { x: 0, y: 0, direction: 45 }));
    rt.attachTargetToParent('c', 'p');
    const child = rt.getTargetById('c')!;
    expect(child.worldTransform!.worldDirection).toBe(45);
  });

  // ── 56. Deep hierarchy size propagation ──────────────────────────

  it('nested hierarchy propagates size correctly', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('g', 'Grandparent', [], { x: 0, y: 0, size: 200 }));
    rt.addTarget(makeSprite('p', 'Parent', [], { x: 0, y: 0, size: 50 }));
    rt.addTarget(makeSprite('c', 'Child', [], { x: 0, y: 0, size: 100 }));
    rt.attachTargetToParent('p', 'g');
    rt.attachTargetToParent('c', 'p');
    const child = rt.getTargetById('c')!;
    expect(child.worldTransform!.worldSize).toBe(100);
  });

  // ── 57. Clone of parented target is not in hierarchy ──────────────

  it('clone of parented target does not inherit hierarchy parent', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('p', 'Parent', [], { x: 100 }));
    rt.addTarget(makeSprite('c', 'Child', [], { x: 10 }));
    rt.attachTargetToParent('c', 'p');
    rt.createCloneOf('c');
    const clone = rt.getTargets().find(t => t.isClone);
    expect(clone).toBeDefined();
    expect(rt.getParentTargetId(clone!.id)).toBeUndefined();
  });

  // ── 58. Snapshot hierarchy fields for unparented targets ──────────

  it('snapshot hierarchyParentId is undefined for root targets', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'A'));
    const snap = rt.getStageSnapshot();
    const s1Snap = snap.find(s => s.targetId === 's1');
    expect(s1Snap!.hierarchyParentId).toBeUndefined();
  });

  // ── 59. computeWorldTransforms after detach ───────────────────────

  it('computeWorldTransforms after detach produces correct root transform', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('p', 'Parent', [], { x: 100 }));
    rt.addTarget(makeSprite('c', 'Child', [], { x: 10 }));
    rt.attachTargetToParent('c', 'p');
    rt.detachTargetFromParent('c');
    rt.computeWorldTransforms();
    expect(rt.getTargetById('c')!.worldTransform!.worldX).toBe(10);
  });
});
