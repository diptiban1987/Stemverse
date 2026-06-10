import { describe, it, expect, beforeEach } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { SpriteState, StageState, ASTBlock, ASTScript, VariableState, ListState } from '../src/types';
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

describe('Phase 7L: Project Serialization', () => {
  // ── Export basic structure ──────────────────────────────────────

  it('exportProject returns valid SerializedProject shape', async () => {
    const rt = await createRuntime();
    const p = rt.exportProject();
    expect(p.version).toBe('0.1.0');
    expect(p.stage).toBeDefined();
    expect(Array.isArray(p.targets)).toBe(true);
    expect(p.assets).toBeDefined();
    expect(p.metadata).toBeDefined();
  });

  it('exportProject includes stage metadata', async () => {
    const rt = await createRuntime();
    const stage = makeStage();
    rt.addTarget(stage);
    const p = rt.exportProject();
    expect(p.stage.stageTargetId).toBe('stage');
    expect(typeof p.stage.currentBackdropIndex).toBe('number');
  });

  it('exportProject includes sprite targets', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat'));
    const p = rt.exportProject();
    const sprites = p.targets.filter(t => !t.isStage);
    expect(sprites.length).toBe(1);
    expect(sprites[0].name).toBe('Cat');
  });

  // ── Clone exclusion ─────────────────────────────────────────────

  it('exportProject excludes clone targets', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat'));
    rt.createCloneOf('s1');
    const p = rt.exportProject();
    expect(p.targets.every(t => !t.id.includes('_clone_'))).toBe(true);
  });

  it('exportProject excludes runtimeGenerated clones', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat'));
    rt.createCloneOf('s1');
    const cloneIds = Array.from((rt as any).targets.values()).filter((t: any) => t.isClone);
    expect(cloneIds.length).toBeGreaterThan(0);
    const p = rt.exportProject();
    expect(p.targets.length).toBe(2); // stage + original sprite only
  });

  // ── Deep-copy guarantees ────────────────────────────────────────

  it('exportProject deep-copies variables (no reference sharing)', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', [], { variables: { v1: { id: 'v1', name: 'score', value: 42 } } }));
    const p = rt.exportProject();
    const exportedVar = p.targets.find(t => t.id === 's1')!.variables!['v1'];
    exportedVar.value = 999;
    const p2 = rt.exportProject();
    expect(p2.targets.find(t => t.id === 's1')!.variables!['v1'].value).toBe(42);
  });

  it('exportProject deep-copies list values (no reference sharing)', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', [], { lists: { l1: { id: 'l1', name: 'items', value: [1, 2, 3] } } }));
    const p = rt.exportProject();
    const list = p.targets.find(t => t.id === 's1')!.lists!['l1'];
    (list.value as number[]).push(99);
    const p2 = rt.exportProject();
    expect((p2.targets.find(t => t.id === 's1')!.lists!['l1'].value as number[]).length).toBe(3);
  });

  it('exportProject deep-copies scripts (mutation safe)', async () => {
    const rt = await createRuntime();
    const block = makeBlock('b1', 'motion_movesteps', null, { STEPS: 10 });
    const script = makeScript('event_whenflagclicked', [block]);
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', [script]));
    const p = rt.exportProject();
    const exportedScript = p.targets.find(t => t.id === 's1')!.scripts![0];
    delete exportedScript.blocks['b1'];
    const p2 = rt.exportProject();
    expect(p2.targets.find(t => t.id === 's1')!.scripts![0].blocks['b1']).toBeDefined();
  });

  // ── Deterministic export ordering ───────────────────────────────

  it('exportProject produces deterministic target ordering', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Alpha'));
    rt.addTarget(makeSprite('s2', 'Beta'));
    const p1 = rt.exportProject();
    const p2 = rt.exportProject();
    expect(p1.targets.map(t => t.id)).toEqual(p2.targets.map(t => t.id));
  });

  it('exportProject produces deterministic asset ordering', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.registerCostume({ id: 'c1', name: 'a', type: 'costume', assetId: 'a1', dataFormat: 'svg' });
    rt.registerCostume({ id: 'c2', name: 'b', type: 'costume', assetId: 'a2', dataFormat: 'svg' });
    const p1 = rt.exportProject();
    const p2 = rt.exportProject();
    expect(p1.assets.costumes.map(a => a.id)).toEqual(p2.assets.costumes.map(a => a.id));
  });

  // ── No activeThread restoration ─────────────────────────────────

  it('importProject does not restore activeThreads', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat'));
    rt.activeThreads.push({ id: 't1', targetId: 's1', topBlockId: 'b1', status: 'RUNNING', currentBlockId: 'b1', stack: [], context: { targetId: 's1', variables: {}, localScope: {} }, isKilled: false, yieldRequest: false });
    const p = rt.exportProject();
    const rt2 = await createRuntime();
    rt2.importProject(p);
    expect(rt2.activeThreads.length).toBe(0);
  });

  // ── No BLOCKED/WAITING restoration ──────────────────────────────

  it('importProject does not restore BLOCKED state', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat'));
    rt.activeThreads.push({ id: 't1', targetId: 's1', topBlockId: 'b1', status: 'BLOCKED', currentBlockId: 'b1', stack: [], context: { targetId: 's1', variables: {}, localScope: {} }, isKilled: false, yieldRequest: false });
    const p = rt.exportProject();
    const rt2 = await createRuntime();
    rt2.importProject(p);
    expect(rt2.activeThreads.length).toBe(0);
  });

  // ── No clone restoration ────────────────────────────────────────

  it('importProject does not restore clones', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat'));
    rt.createCloneOf('s1');
    const p = rt.exportProject();
    const rt2 = await createRuntime();
    rt2.importProject(p);
    const clones = Array.from((rt2 as any).targets.values()).filter((t: any) => t.isClone);
    expect(clones.length).toBe(0);
  });

  // ── Initialize-before-import safety ─────────────────────────────

  it('importProject calls initialize first (clean slate)', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Old'));
    rt.activeThreads.push({ id: 't1', targetId: 's1', topBlockId: 'b1', status: 'RUNNING', currentBlockId: 'b1', stack: [], context: { targetId: 's1', variables: {}, localScope: {} }, isKilled: false, yieldRequest: false });
    const p = rt.exportProject();
    const rt2 = await createRuntime();
    rt2.addTarget(makeStage());
    rt2.addTarget(makeSprite('s_pre', 'Preexisting'));
    rt2.activeThreads.push({ id: 'tx', targetId: 's_pre', topBlockId: 'bx', status: 'RUNNING', currentBlockId: 'bx', stack: [], context: { targetId: 's_pre', variables: {}, localScope: {} }, isKilled: false, yieldRequest: false });
    rt2.importProject(p);
    expect(rt2.activeThreads.length).toBe(0);
    expect(Array.from((rt2 as any).targets.values()).some((t: any) => t.name === 'Preexisting')).toBe(false);
  });

  // ── Import cleanup safety ───────────────────────────────────────

  it('importProject with null input does not throw', async () => {
    const rt = await createRuntime();
    expect(() => rt.importProject(null as any)).not.toThrow();
  });

  it('importProject with missing targets array does not throw', async () => {
    const rt = await createRuntime();
    expect(() => rt.importProject({ version: '0.1.0' } as any)).not.toThrow();
  });

  it('importProject with invalid target entry skips gracefully', async () => {
    const rt = await createRuntime();
    rt.importProject({ version: '0.1.0', stage: { stageTargetId: 'stage', currentBackdropIndex: 0 }, targets: [null as any, { id: 's1', name: 'Cat' } as any], assets: { costumes: [], backdrops: [], sounds: [] }, metadata: { exportedAtMs: 0, runtimeVersion: '0.1.0' } });
    expect(Array.from((rt as any).targets.values()).length).toBe(1);
  });

  // ── Stop/reset persistence cleanup ──────────────────────────────

  it('exportProject after stopAll still contains targets', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat'));
    rt.stop();
    const p = rt.exportProject();
    expect(p.targets.length).toBe(2);
  });

  it('initialize clears all serialization-relevant state', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat'));
    rt.registerWatcher({ id: 'w1', variableId: 'v1', label: 'score', visible: true, x: 0, y: 0, mode: 'DEFAULT', value: 0 });
    await rt.initialize();
    const p = rt.exportProject();
    expect(p.targets.length).toBe(0);
  });

  // ── Deterministic replay safety ─────────────────────────────────

  it('export-import-export produces identical outputs', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', [], { variables: { v1: { id: 'v1', name: 'score', value: 7 } } }));
    const p1 = rt.exportProject();
    const rt2 = await createRuntime();
    rt2.importProject(p1);
    const p2 = rt2.exportProject();
    expect(p1.targets.map(t => t.id).sort()).toEqual(p2.targets.map(t => t.id).sort());
    expect(p1.version).toBe(p2.version);
  });

  it('export-import round-trip preserves sprite position', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', [], { x: 42, y: -17, direction: 180 }));
    const p = rt.exportProject();
    const rt2 = await createRuntime();
    rt2.importProject(p);
    const sprite = Array.from((rt2 as any).targets.values()).find((t: any) => t.id === 's1') as SpriteState;
    expect(sprite.x).toBe(42);
    expect(sprite.y).toBe(-17);
    expect(sprite.direction).toBe(180);
  });

  it('export-import round-trip preserves stage properties', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage([], { tempo: 120, videoState: 'on' }));
    const p = rt.exportProject();
    const rt2 = await createRuntime();
    rt2.importProject(p);
    const stage = Array.from((rt2 as any).targets.values()).find((t: any) => t.isStage) as StageState;
    expect(stage.tempo).toBe(120);
    expect(stage.videoState).toBe('on');
  });

  // ── Imported project isolation ──────────────────────────────────

  it('imported project is isolated from original runtime', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat', [], { variables: { v1: { id: 'v1', name: 'score', value: 10 } } }));
    const p = rt.exportProject();
    const rt2 = await createRuntime();
    rt2.importProject(p);
    const sprite2 = Array.from((rt2 as any).targets.values()).find((t: any) => t.id === 's1') as SpriteState;
    sprite2.variables['v1'].value = 999;
    const sprite1 = Array.from((rt as any).targets.values()).find((t: any) => t.id === 's1') as SpriteState;
    expect(sprite1.variables['v1'].value).toBe(10);
  });

  it('modifying exported data does not affect runtime', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat'));
    const p = rt.exportProject();
    p.targets = [];
    const p2 = rt.exportProject();
    expect(p2.targets.length).toBe(2);
  });

  // ── Renderer independence ───────────────────────────────────────

  it('exportProject works without renderer adapter', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat'));
    expect((rt as any).rendererAdapter).toBeUndefined();
    const p = rt.exportProject();
    expect(p.targets.length).toBe(2);
  });

  it('importProject works without renderer adapter', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    const p = rt.exportProject();
    const rt2 = await createRuntime();
    expect((rt2 as any).rendererAdapter).toBeUndefined();
    rt2.importProject(p);
    expect(Array.from((rt2 as any).targets.values()).length).toBe(1);
  });

  // ── Runtime metadata exclusion ───────────────────────────────────

  it('exportProject does not include thread data in output', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat'));
    rt.activeThreads.push({ id: 't1', targetId: 's1', topBlockId: 'b1', status: 'RUNNING', currentBlockId: 'b1', stack: [], context: { targetId: 's1', variables: {}, localScope: {} }, isKilled: false, yieldRequest: false });
    const p = rt.exportProject();
    expect((p as any).activeThreads).toBeUndefined();
    expect((p as any).threads).toBeUndefined();
  });

  it('exportProject does not include renderer state', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    const p = rt.exportProject();
    expect((p as any).rendererAdapter).toBeUndefined();
    expect((p as any).renderer).toBeUndefined();
  });

  it('exportProject does not include pen command history', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    const p = rt.exportProject();
    expect((p as any).penCommands).toBeUndefined();
  });

  it('exportProject does not include pending questions', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    const p = rt.exportProject();
    expect((p as any).pendingQuestions).toBeUndefined();
  });

  // ── Version metadata ─────────────────────────────────────────────

  it('exportProject includes runtime version in metadata', async () => {
    const rt = await createRuntime();
    const p = rt.exportProject();
    expect(p.metadata.runtimeVersion).toBe('0.1.0');
  });

  it('exportProject records timer ms in metadata', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    const p = rt.exportProject();
    expect(typeof p.metadata.exportedAtMs).toBe('number');
  });

  // ── Watcher serialization ───────────────────────────────────────

  it('exportProject includes variable watchers for targets', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat'));
    rt.registerWatcher({ id: 'w1', variableId: 'v1', targetId: 's1', label: 'score', visible: true, x: 10, y: 20, mode: 'DEFAULT', value: 42 });
    const p = rt.exportProject();
    const cat = p.targets.find(t => t.id === 's1');
    expect(cat!.watchers).toBeDefined();
    expect(cat!.watchers!.length).toBe(1);
    expect(cat!.watchers![0].value).toBe(42);
  });

  it('importProject restores watchers', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat'));
    rt.registerWatcher({ id: 'w1', variableId: 'v1', targetId: 's1', label: 'score', visible: true, x: 10, y: 20, mode: 'DEFAULT', value: 42 });
    const p = rt.exportProject();
    const rt2 = await createRuntime();
    rt2.importProject(p);
    expect(rt2.getWatcher('w1')).toBeDefined();
    expect(rt2.getWatcher('w1')!.value).toBe(42);
  });

  // ── Asset serialization ─────────────────────────────────────────

  it('exportProject includes registered costumes', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.registerCostume({ id: 'c1', name: 'cat', type: 'costume', assetId: 'a1', dataFormat: 'svg' });
    const p = rt.exportProject();
    expect(p.assets.costumes.length).toBe(1);
    expect(p.assets.costumes[0].id).toBe('c1');
  });

  it('importProject restores costume assets', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    rt.registerCostume({ id: 'c1', name: 'cat', type: 'costume', assetId: 'a1', dataFormat: 'svg' });
    const p = rt.exportProject();
    const rt2 = await createRuntime();
    rt2.importProject(p);
    const c = rt2.costumeRegistry.get('c1');
    expect(c).toBeDefined();
    expect(c!.name).toBe('cat');
  });
});
