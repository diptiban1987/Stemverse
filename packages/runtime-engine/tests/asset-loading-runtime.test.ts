import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { InMemoryRendererAdapter } from '../src/stage/renderer-adapter';
import { SpriteState, StageState, ASTBlock, ASTScript, CostumeAsset, SoundAsset, BackdropAsset, RuntimeAssetState } from '../src/types';
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

function makeCostume(id: string, name: string = 'costume1'): CostumeAsset {
  return { id, name, type: 'costume', assetId: `asset_${id}`, dataFormat: 'svg' };
}

function makeSound(id: string, name: string = 'sound1'): SoundAsset {
  return { id, name, type: 'sound', assetId: `asset_${id}`, dataFormat: 'wav', sampleRate: 22050, sampleCount: 11025 };
}

function makeBackdrop(id: string, name: string = 'backdrop1'): BackdropAsset {
  return { id, name, type: 'backdrop', assetId: `asset_${id}`, dataFormat: 'svg' };
}

async function createRuntime(): Promise<BaseRuntime> {
  const rt = new BaseRuntime();
  await rt.initialize();
  resetThreadCounter();
  return rt;
}

describe('Phase 7M: Runtime Asset Loading & Deferred Resource Resolution', () => {

  // ── 1. Asset State Registration ──────────────────────────────────

  it('registerAssetState creates a new asset state entry', async () => {
    const rt = await createRuntime();
    rt.registerAssetState({ assetId: 'c1', assetType: 'costume', status: 'UNLOADED', resolved: false });
    const state = rt.getAssetState('c1');
    expect(state).toBeDefined();
    expect(state!.assetId).toBe('c1');
    expect(state!.status).toBe('UNLOADED');
  });

  it('registerAssetState stores a deep copy (not a reference)', async () => {
    const rt = await createRuntime();
    const input: RuntimeAssetState = { assetId: 'c1', assetType: 'costume', status: 'UNLOADED', resolved: false };
    rt.registerAssetState(input);
    input.status = 'READY';
    const stored = rt.getAssetState('c1');
    expect(stored!.status).toBe('UNLOADED');
  });

  // ── 2. Default UNLOADED State ───────────────────────────────────

  it('registerCostume auto-registers UNLOADED asset state', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    const state = rt.getAssetState('c1');
    expect(state).toBeDefined();
    expect(state!.status).toBe('UNLOADED');
    expect(state!.resolved).toBe(false);
    expect(state!.assetType).toBe('costume');
  });

  it('registerSound auto-registers UNLOADED asset state', async () => {
    const rt = await createRuntime();
    rt.registerSound(makeSound('s1'));
    const state = rt.getAssetState('s1');
    expect(state).toBeDefined();
    expect(state!.status).toBe('UNLOADED');
    expect(state!.assetType).toBe('sound');
  });

  it('registerBackdrop auto-registers UNLOADED asset state', async () => {
    const rt = await createRuntime();
    rt.registerBackdrop(makeBackdrop('b1'));
    const state = rt.getAssetState('b1');
    expect(state).toBeDefined();
    expect(state!.status).toBe('UNLOADED');
    expect(state!.assetType).toBe('backdrop');
  });

  // ── 3. LOADING Transitions ───────────────────────────────────────

  it('markAssetLoading transitions UNLOADED -> LOADING', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    expect(rt.getAssetState('c1')!.status).toBe('LOADING');
    expect(rt.getAssetState('c1')!.resolved).toBe(false);
  });

  it('markAssetLoading sets runtimePath', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1', '/assets/c1.svg');
    expect(rt.getAssetState('c1')!.runtimePath).toBe('/assets/c1.svg');
  });

  it('markAssetLoading clears errorMessage', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    rt.markAssetFailed('c1', 'network error');
    rt.markAssetLoading('c1');
    expect(rt.getAssetState('c1')!.errorMessage).toBeUndefined();
  });

  // ── 4. READY Transitions ─────────────────────────────────────────

  it('markAssetReady transitions LOADING -> READY', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    rt.markAssetReady('c1');
    const state = rt.getAssetState('c1');
    expect(state!.status).toBe('READY');
    expect(state!.resolved).toBe(true);
  });

  it('markAssetReady clears errorMessage', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    rt.markAssetReady('c1');
    expect(rt.getAssetState('c1')!.errorMessage).toBeUndefined();
  });

  // ── 5. FAILED Transitions ────────────────────────────────────────

  it('markAssetFailed transitions LOADING -> FAILED', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    rt.markAssetFailed('c1', 'decode error');
    const state = rt.getAssetState('c1');
    expect(state!.status).toBe('FAILED');
    expect(state!.resolved).toBe(false);
    expect(state!.errorMessage).toBe('decode error');
  });

  // ── 6. MISSING Transitions ───────────────────────────────────────

  it('markAssetMissing transitions UNLOADED -> MISSING', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetMissing('c1');
    const state = rt.getAssetState('c1');
    expect(state!.status).toBe('MISSING');
    expect(state!.resolved).toBe(false);
  });

  // ── 7. Invalid Transition Warnings ───────────────────────────────

  it('invalid transition UNLOADED -> READY warns and preserves state', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetReady('c1');
    expect(rt.getAssetState('c1')!.status).toBe('UNLOADED');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('invalid transition READY -> LOADING warns and preserves state', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    rt.markAssetReady('c1');
    rt.markAssetLoading('c1');
    expect(rt.getAssetState('c1')!.status).toBe('READY');
    warnSpy.mockRestore();
  });

  it('invalid transition MISSING -> READY warns and preserves state', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetMissing('c1');
    rt.markAssetReady('c1');
    expect(rt.getAssetState('c1')!.status).toBe('MISSING');
    warnSpy.mockRestore();
  });

  // ── 8. Duplicate Asset Registration ──────────────────────────────

  it('duplicate registerAssetState warns', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.registerAssetState({ assetId: 'c1', assetType: 'costume', status: 'UNLOADED', resolved: false });
    rt.registerAssetState({ assetId: 'c1', assetType: 'costume', status: 'UNLOADED', resolved: false });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // ── 9. Deterministic Asset Ordering ─────────────────────────────

  it('getAllAssetStates returns deterministic insertion order', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c3'));
    rt.registerCostume(makeCostume('c1'));
    rt.registerCostume(makeCostume('c2'));
    const states = rt.getAllAssetStates();
    expect(states[0].assetId).toBe('c3');
    expect(states[1].assetId).toBe('c1');
    expect(states[2].assetId).toBe('c2');
  });

  // ── 10. Deep-Copy Snapshot Guarantees ────────────────────────────

  it('mutating snapshot assetStates does not affect runtime state', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    rt.markAssetReady('c1');
    rt.addTarget(makeStage());
    const snapshot = rt.getStageSnapshot();
    const stageSnap = snapshot.find(s => s.targetId === 'stage');
    expect(stageSnap!.assetStates).toBeDefined();
    if (stageSnap!.assetStates) {
      stageSnap!.assetStates[0].status = 'FAILED';
    }
    expect(rt.getAssetState('c1')!.status).toBe('READY');
  });

  it('getAssetState returns a copy, not a reference', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    const state1 = rt.getAssetState('c1');
    const state2 = rt.getAssetState('c1');
    expect(state1).toEqual(state2);
    expect(state1).not.toBe(state2);
  });

  // ── 11. Runtime-Renderer Isolation ───────────────────────────────

  it('renderer adapter receives assetStates as metadata only', async () => {
    const rt = await createRuntime();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    rt.markAssetReady('c1');
    rt.addTarget(makeStage());
    const snapshot = rt.getStageSnapshot();
    adapter.syncStage(snapshot);
    const stageTarget = adapter.targets.get('stage');
    expect(stageTarget).toBeDefined();
    expect(stageTarget!.assetStates).toBeDefined();
    expect(stageTarget!.assetStates!.length).toBe(1);
    expect(stageTarget!.assetStates![0].assetId).toBe('c1');
  });

  it('renderer assetStates mutation does not affect runtime', async () => {
    const rt = await createRuntime();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    rt.markAssetReady('c1');
    rt.addTarget(makeStage());
    adapter.syncStage(rt.getStageSnapshot());
    const stageTarget = adapter.targets.get('stage');
    stageTarget!.assetStates![0].status = 'FAILED';
    expect(rt.getAssetState('c1')!.status).toBe('READY');
  });

  // ── 12. Import/Export Persistence ────────────────────────────────

  it('exportProject preserves runtimeState on costumes', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    rt.markAssetReady('c1');
    const exported = rt.exportProject();
    const costume = exported.assets.costumes.find(c => c.id === 'c1');
    expect(costume).toBeDefined();
    expect(costume!.runtimeState).toBeDefined();
    expect(costume!.runtimeState!.status).toBe('READY');
  });

  it('importProject restores runtimeState from serialized data', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    rt.markAssetReady('c1');
    rt.registerSound(makeSound('s1'));
    rt.markAssetLoading('s1');
    rt.markAssetFailed('s1', 'timeout');
    const exported = rt.exportProject();
    const rt2 = await createRuntime();
    rt2.importProject(exported);
    expect(rt2.getAssetState('c1')!.status).toBe('READY');
    expect(rt2.getAssetState('c1')!.resolved).toBe(true);
    expect(rt2.getAssetState('s1')!.status).toBe('FAILED');
    expect(rt2.getAssetState('s1')!.errorMessage).toBe('timeout');
  });

  it('importProject with no runtimeState defaults to UNLOADED', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    const exported = rt.exportProject();
    const costume = exported.assets.costumes.find(c => c.id === 'c1');
    expect(costume!.runtimeState).toBeDefined();
    expect(costume!.runtimeState!.status).toBe('UNLOADED');
  });

  // ── 13. Clone-Safe Asset Inheritance ─────────────────────────────

  it('clone inherits parent asset states in snapshot', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetReady('c1');
    rt.addTarget(makeStage());
    const sprite = makeSprite('s1', 'Cat');
    sprite.costumes = [makeCostume('c1')];
    rt.addTarget(sprite);
    rt.createCloneOf('s1');
    const snapshot = rt.getStageSnapshot();
    expect(snapshot.length).toBeGreaterThan(0);
  });

  it('clone asset state mutation does not affect parent', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    rt.markAssetReady('c1');
    rt.addTarget(makeStage());
    const sprite = makeSprite('s1', 'Cat');
    rt.addTarget(sprite);
    rt.createCloneOf('s1');
    const parentState = rt.getAssetState('c1');
    expect(parentState!.status).toBe('READY');
  });

  // ── 14. Fallback Semantics ───────────────────────────────────────

  it('MISSING asset does not crash runtime', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetMissing('c1');
    rt.addTarget(makeStage());
    const snapshot = rt.getStageSnapshot();
    expect(snapshot).toBeDefined();
  });

  it('FAILED asset does not crash runtime', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    rt.markAssetFailed('c1', 'error');
    rt.addTarget(makeStage());
    const snapshot = rt.getStageSnapshot();
    expect(snapshot).toBeDefined();
  });

  it('UNLOADED asset preserves execution', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat'));
    expect(() => rt.getStageSnapshot()).not.toThrow();
  });

  // ── 15. Unresolved Asset Safety ──────────────────────────────────

  it('unresolved assets remain visible in snapshots', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.registerSound(makeSound('s1'));
    rt.addTarget(makeStage());
    const snapshot = rt.getStageSnapshot();
    const stageSnap = snapshot.find(s => s.targetId === 'stage');
    expect(stageSnap!.assetStates).toBeDefined();
    expect(stageSnap!.assetStates!.length).toBe(2);
    expect(stageSnap!.assetStates!.every(a => a.status === 'UNLOADED')).toBe(true);
  });

  // ── 16. Malformed Asset Handling ─────────────────────────────────

  it('registerAssetState with null assetId warns', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.registerAssetState({ assetId: '', assetType: 'costume', status: 'UNLOADED', resolved: false });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('registerAssetState with invalid assetType warns', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.registerAssetState({ assetId: 'x1', assetType: 'invalid' as any, status: 'UNLOADED', resolved: false });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // ── 17. Invalid Asset IDs ────────────────────────────────────────

  it('markAssetLoading with nonexistent assetId warns', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.markAssetLoading('nonexistent');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('markAssetReady with empty string warns', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.markAssetReady('');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // ── 18. Renderer Synchronization ─────────────────────────────────

  it('InMemoryRendererAdapter syncs assetStates from snapshot', async () => {
    const rt = await createRuntime();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    rt.registerCostume(makeCostume('c1'));
    rt.registerSound(makeSound('s1'));
    rt.markAssetLoading('c1');
    rt.markAssetReady('c1');
    rt.addTarget(makeStage());
    adapter.syncStage(rt.getStageSnapshot());
    const stage = adapter.targets.get('stage');
    expect(stage!.assetStates).toBeDefined();
    expect(stage!.assetStates!.length).toBe(2);
    const readyAsset = stage!.assetStates!.find(a => a.assetId === 'c1');
    expect(readyAsset!.status).toBe('READY');
  });

  // ── 19. Pixi Metadata Ingestion ──────────────────────────────────

  it('PixiRendererAdapter receives assetStates as metadata only', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    rt.markAssetReady('c1');
    rt.addTarget(makeStage());
    const snapshot = rt.getStageSnapshot();
    const stageSnap = snapshot.find(s => s.targetId === 'stage');
    expect(stageSnap!.assetStates).toBeDefined();
    expect(stageSnap!.assetStates!.length).toBe(1);
    expect(stageSnap!.assetStates![0].status).toBe('READY');
  });

  // ── 20. Centralized Cleanup Preservation ─────────────────────────

  it('stop() clears assetStates', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetReady('c1');
    expect(rt.getAllAssetStates().length).toBe(1);
    rt.stop();
    expect(rt.getAllAssetStates().length).toBe(0);
  });

  // ── 21. Stop/Reset Cleanup ───────────────────────────────────────

  it('initialize() clears assetStates', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetReady('c1');
    await rt.initialize();
    expect(rt.getAllAssetStates().length).toBe(0);
  });

  // ── 22. Deterministic Replay Safety ──────────────────────────────

  it('export-import-export produces identical asset states', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    rt.markAssetReady('c1');
    rt.registerBackdrop(makeBackdrop('b1'));
    rt.markAssetLoading('b1');
    rt.markAssetFailed('b1', '404');
    const exported1 = rt.exportProject();
    const rt2 = await createRuntime();
    rt2.importProject(exported1);
    const exported2 = rt2.exportProject();
    const c1_a = exported1.assets.costumes.find(c => c.id === 'c1')!.runtimeState;
    const c1_b = exported2.assets.costumes.find(c => c.id === 'c1')!.runtimeState;
    expect(c1_a).toEqual(c1_b);
    const b1_a = exported1.assets.backdrops.find(b => b.id === 'b1')!.runtimeState;
    const b1_b = exported2.assets.backdrops.find(b => b.id === 'b1')!.runtimeState;
    expect(b1_a).toEqual(b1_b);
  });

  // ── 23. No Async Scheduler Ownership ──────────────────────────────

  it('asset state transitions are synchronous', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    rt.markAssetReady('c1');
    expect(rt.getAssetState('c1')!.status).toBe('READY');
  });

  // ── 24. No Promise Serialization ─────────────────────────────────

  it('RuntimeAssetState contains no promises or functions', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1', '/path');
    rt.markAssetReady('c1');
    const state = rt.getAssetState('c1');
    expect(state).toBeDefined();
    const serialized = JSON.parse(JSON.stringify(state));
    expect(serialized.status).toBe('READY');
    expect(serialized.runtimePath).toBe('/path');
  });

  // ── 25. Missing Asset Persistence ────────────────────────────────

  it('MISSING state persists across export/import', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetMissing('c1');
    const exported = rt.exportProject();
    const rt2 = await createRuntime();
    rt2.importProject(exported);
    expect(rt2.getAssetState('c1')!.status).toBe('MISSING');
    expect(rt2.getAssetState('c1')!.resolved).toBe(false);
  });

  // ── 26. Failed Asset Persistence ─────────────────────────────────

  it('FAILED state with errorMessage persists across export/import', async () => {
    const rt = await createRuntime();
    rt.registerSound(makeSound('s1'));
    rt.markAssetLoading('s1');
    rt.markAssetFailed('s1', 'network timeout');
    const exported = rt.exportProject();
    const rt2 = await createRuntime();
    rt2.importProject(exported);
    expect(rt2.getAssetState('s1')!.status).toBe('FAILED');
    expect(rt2.getAssetState('s1')!.errorMessage).toBe('network timeout');
  });

  // ── 27. READY State Persistence ──────────────────────────────────

  it('READY state persists across export/import', async () => {
    const rt = await createRuntime();
    rt.registerBackdrop(makeBackdrop('b1'));
    rt.markAssetLoading('b1');
    rt.markAssetReady('b1');
    const exported = rt.exportProject();
    const rt2 = await createRuntime();
    rt2.importProject(exported);
    expect(rt2.getAssetState('b1')!.status).toBe('READY');
    expect(rt2.getAssetState('b1')!.resolved).toBe(true);
  });

  // ── 28. Immutable Snapshot Guarantees ─────────────────────────────

  it('getAllAssetStates returns copies, not references', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    const states1 = rt.getAllAssetStates();
    const states2 = rt.getAllAssetStates();
    expect(states1).toEqual(states2);
    expect(states1[0]).not.toBe(states2[0]);
  });

  // ── 29. Asset Registry Rebuild Safety ────────────────────────────

  it('registering same costume twice does not create duplicate asset state', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.registerCostume(makeCostume('c1'));
    expect(rt.getAllAssetStates().filter(s => s.assetId === 'c1').length).toBe(1);
  });

  // ── 30. Import Cleanup Safety ─────────────────────────────────────

  it('importProject with malformed runtimeState gracefully skips', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    const exported = rt.exportProject();
    const rt2 = await createRuntime();
    expect(() => rt2.importProject(exported)).not.toThrow();
  });

  // ── 31. Renderer Independence ────────────────────────────────────

  it('runtime continues without renderer adapter', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    rt.markAssetReady('c1');
    expect(rt.getAssetState('c1')!.status).toBe('READY');
  });

  // ── 32. Metadata-Only Execution Safety ───────────────────────────

  it('runtime executes ticks with UNLOADED assets without error', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat'));
    expect(() => rt.stepOnce()).not.toThrow();
  });

  it('runtime executes ticks with FAILED assets without error', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    rt.markAssetFailed('c1', 'error');
    rt.addTarget(makeStage());
    rt.addTarget(makeSprite('s1', 'Cat'));
    expect(() => rt.stepOnce()).not.toThrow();
  });

  // ── 33. Serialization Boundaries ─────────────────────────────────

  it('exported runtimeState is JSON-serializable', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1', '/assets/c1.svg');
    rt.markAssetReady('c1');
    const exported = rt.exportProject();
    expect(() => JSON.parse(JSON.stringify(exported))).not.toThrow();
    const parsed = JSON.parse(JSON.stringify(exported));
    const costume = parsed.assets.costumes.find((c: any) => c.id === 'c1');
    expect(costume.runtimeState.status).toBe('READY');
  });

  // ── 34. Runtime State Isolation ───────────────────────────────────

  it('two separate runtimes have isolated asset states', async () => {
    const rt1 = await createRuntime();
    const rt2 = await createRuntime();
    rt1.registerCostume(makeCostume('c1'));
    rt1.markAssetLoading('c1');
    rt1.markAssetReady('c1');
    rt2.registerCostume(makeCostume('c1'));
    expect(rt1.getAssetState('c1')!.status).toBe('READY');
    expect(rt2.getAssetState('c1')!.status).toBe('UNLOADED');
  });

  // ── 35. No Texture Ownership ──────────────────────────────────────

  it('asset state has no texture or loader references', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    rt.markAssetReady('c1');
    const state = rt.getAssetState('c1');
    const keys = Object.keys(state!);
    expect(keys).not.toContain('texture');
    expect(keys).not.toContain('loader');
    expect(keys).not.toContain('promise');
  });

  // ── 36. No Loader Ownership ───────────────────────────────────────

  it('asset state lifecycle has no fetch or async ownership', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    rt.markAssetReady('c1');
    const state = rt.getAssetState('c1');
    const serialized = JSON.stringify(state);
    expect(serialized).not.toContain('fetch');
    expect(serialized).not.toContain('Promise');
    expect(serialized).not.toContain('async');
  });

  // ── Additional: FAILED -> LOADING retry transition ────────────────

  it('FAILED -> LOADING is a valid retry transition', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    rt.markAssetFailed('c1', 'error');
    expect(rt.getAssetState('c1')!.status).toBe('FAILED');
    rt.markAssetLoading('c1');
    expect(rt.getAssetState('c1')!.status).toBe('LOADING');
  });

  // ── Additional: full lifecycle UNLOADED -> LOADING -> READY ───────

  it('full lifecycle UNLOADED -> LOADING -> READY works', async () => {
    const rt = await createRuntime();
    rt.registerCostume(makeCostume('c1'));
    expect(rt.getAssetState('c1')!.status).toBe('UNLOADED');
    rt.markAssetLoading('c1', '/assets/c1.svg');
    expect(rt.getAssetState('c1')!.status).toBe('LOADING');
    rt.markAssetReady('c1');
    expect(rt.getAssetState('c1')!.status).toBe('READY');
    expect(rt.getAssetState('c1')!.resolved).toBe(true);
  });

  // ── Additional: snapshot with zero assets ─────────────────────────

  it('snapshot with zero assets returns undefined assetStates on stage', async () => {
    const rt = await createRuntime();
    rt.addTarget(makeStage());
    const snapshot = rt.getStageSnapshot();
    const stageSnap = snapshot.find(s => s.targetId === 'stage');
    expect(stageSnap!.assetStates).toBeDefined();
    expect(stageSnap!.assetStates!.length).toBe(0);
  });

  // ── Additional: registerAssetState with invalid status warns ──────

  it('registerAssetState with invalid status warns', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rt.registerAssetState({ assetId: 'c1', assetType: 'costume', status: 'INVALID' as any, resolved: false });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // ── Additional: transitionAssetState with null assetId ────────────

  it('transition methods with null assetId warn without throwing', async () => {
    const rt = await createRuntime();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => rt.markAssetLoading('')).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // ── Additional: renderer adapter assetStates deep copy ────────────

  it('InMemoryRendererAdapter deep-copies assetStates', async () => {
    const rt = await createRuntime();
    const adapter = new InMemoryRendererAdapter();
    adapter.initialize();
    rt.registerCostume(makeCostume('c1'));
    rt.markAssetLoading('c1');
    rt.markAssetReady('c1');
    rt.addTarget(makeStage());
    adapter.syncStage(rt.getStageSnapshot());
    const stageTarget = adapter.targets.get('stage');
    const rendererState = stageTarget!.assetStates![0];
    rendererState.status = 'FAILED';
    const runtimeState = rt.getAssetState('c1');
    expect(runtimeState!.status).toBe('READY');
  });
});
