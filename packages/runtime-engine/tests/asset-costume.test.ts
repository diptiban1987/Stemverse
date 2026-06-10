import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { InMemoryRendererAdapter } from '../src/stage/renderer-adapter';
import { ASTBlock, ASTScript, SpriteState, StageState, CostumeAsset, SoundAsset, BackdropAsset } from '../src/types';
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

describe('Phase 7C — Asset & Costume Runtime Foundation', () => {
  let runtime: BaseRuntime;
  let adapter: InMemoryRendererAdapter;

  beforeEach(async () => {
    runtime = new BaseRuntime();
    await runtime.initialize();
    resetThreadCounter();
    adapter = new InMemoryRendererAdapter();
    adapter.initialize();
  });

  it('1. should support costume asset registration and query', () => {
    const costume: CostumeAsset = {
      id: 'costume_0',
      name: 'costume0',
      type: 'costume',
      assetId: 'asset_hash_costume_0',
      dataFormat: 'png',
      rotationCenterX: 24,
      rotationCenterY: 24
    };

    runtime.registerCostume(costume);
    expect(runtime.costumeRegistry.get('costume_0')).toBe(costume);
  });

  it('2. should support sound asset registration and query', () => {
    const sound: SoundAsset = {
      id: 'sound_0',
      name: 'sound0',
      type: 'sound',
      assetId: 'asset_hash_sound_0',
      dataFormat: 'wav',
      sampleRate: 44100,
      sampleCount: 88200
    };

    runtime.registerSound(sound);
    expect(runtime.soundRegistry.get('sound_0')).toBe(sound);
  });

  it('3. should support backdrop asset registration and query', () => {
    const backdrop: BackdropAsset = {
      id: 'backdrop_0',
      name: 'backdrop0',
      type: 'backdrop',
      assetId: 'asset_hash_backdrop_0',
      dataFormat: 'svg'
    };

    runtime.registerBackdrop(backdrop);
    expect(runtime.backdropRegistry.get('backdrop_0')).toBe(backdrop);
  });

  it('4. should trigger warnings on duplicate asset ID registrations without throwing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const costume1: CostumeAsset = { id: 'c1', name: 'costume1', type: 'costume', assetId: 'a1', dataFormat: 'png' };
    const costume2: CostumeAsset = { id: 'c1', name: 'costume2', type: 'costume', assetId: 'a2', dataFormat: 'png' };

    runtime.registerCostume(costume1);
    runtime.registerCostume(costume2);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Runtime Diagnostics] duplicate asset IDs')
    );

    warnSpy.mockRestore();
  });

  it('5. should lookup and switch sprite costumes by name deterministically', () => {
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'switch' }),
      makeBlock({ id: 'switch', opcode: 'looks_switchcostumeto', inputs: { COSTUME: { name: 'COSTUME', value: 'costume_b' } } })
    ];
    const costumes = [
      { id: 'c0', name: 'costume_a', type: 'costume', assetId: 'h0', dataFormat: 'png' } as CostumeAsset,
      { id: 'c1', name: 'costume_b', type: 'costume', assetId: 'h1', dataFormat: 'png' } as CostumeAsset
    ];
    const sprite = makeSprite({ id: 's1', costumes, currentCostumeIndex: 0, scripts: [makeScript('event_whenflagclicked', blocks)] });
    runtime.addTarget(sprite);

    runtime.start();
    runtime.stepOnce();

    expect(sprite.currentCostumeIndex).toBe(1);
    runtime.stop();
  });

  it('6. should support backdrop switching on the Stage by index and name', () => {
    const stage = makeSprite({
      id: 'stage',
      isStage: true,
      backdrops: [
        { id: 'b0', name: 'backdrop_a', type: 'backdrop', assetId: 'h0', dataFormat: 'png' },
        { id: 'b1', name: 'backdrop_b', type: 'backdrop', assetId: 'h1', dataFormat: 'png' }
      ],
      currentBackdropIndex: 0,
      scripts: []
    } as any);

    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'switch' }),
      makeBlock({ id: 'switch', opcode: 'looks_switchbackdropto', inputs: { BACKDROP: { name: 'BACKDROP', value: 'backdrop_b' } } })
    ];
    const sprite = makeSprite({ id: 's1', scripts: [makeScript('event_whenflagclicked', blocks)] });

    runtime.addTarget(stage);
    runtime.addTarget(sprite);

    runtime.start();
    runtime.stepOnce();

    expect((stage as any).currentBackdropIndex).toBe(1);
    runtime.stop();
  });

  it('7. should support next backdrop wrapping modulo stage backdrops list', () => {
    const stage = makeSprite({
      id: 'stage',
      isStage: true,
      backdrops: [
        { id: 'b0', name: 'backdrop_a', type: 'backdrop', assetId: 'h0', dataFormat: 'png' },
        { id: 'b1', name: 'backdrop_b', type: 'backdrop', assetId: 'h1', dataFormat: 'png' }
      ],
      currentBackdropIndex: 1,
      scripts: []
    } as any);

    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'next' }),
      makeBlock({ id: 'next', opcode: 'looks_nextbackdrop' })
    ];
    const sprite = makeSprite({ id: 's1', scripts: [makeScript('event_whenflagclicked', blocks)] });

    runtime.addTarget(stage);
    runtime.addTarget(sprite);

    runtime.start();
    runtime.stepOnce();

    expect((stage as any).currentBackdropIndex).toBe(0); // wraps from index 1 back to 0
    runtime.stop();
  });

  it('8. should inherit visual costume/sound array references inside clones', () => {
    const costumes = [{ id: 'c0', name: 'c0', type: 'costume', assetId: 'h0', dataFormat: 'png' } as CostumeAsset];
    const parent = makeSprite({ id: 'parent', costumes });
    runtime.addTarget(parent);

    runtime.start();
    runtime.createCloneOf('parent');

    const targets = runtime.getTargets();
    const clone = targets.find(t => t.id !== 'parent')!;

    expect(clone.costumes[0]).toBe(parent.costumes[0]); // shared immutable elements!
    runtime.stop();
  });

  it('9. should preserve independent costume index changes inside clones', () => {
    const costumes = [
      { id: 'c0', name: 'c0', type: 'costume', assetId: 'h0', dataFormat: 'png' } as CostumeAsset,
      { id: 'c1', name: 'c1', type: 'costume', assetId: 'h1', dataFormat: 'png' } as CostumeAsset
    ];
    const parent = makeSprite({ id: 'parent', costumes, currentCostumeIndex: 0 });
    runtime.addTarget(parent);

    runtime.start();
    runtime.createCloneOf('parent');

    const targets = runtime.getTargets();
    const clone = targets.find(t => t.id !== 'parent')!;

    clone.currentCostumeIndex = 1;
    expect(parent.currentCostumeIndex).toBe(0); // parent index remains untouched
    runtime.stop();
  });

  it('10. should synchronize costumeAssetId and costumeName metadata in stage snapshots', () => {
    const costumes = [{ id: 'c0', name: 'costume_name_abc', type: 'costume', assetId: 'asset_hash_123', dataFormat: 'png' } as CostumeAsset];
    const sprite = makeSprite({ id: 's1', costumes, currentCostumeIndex: 0 });
    runtime.addTarget(sprite);

    const snapshot = runtime.getStageSnapshot();
    const snap = snapshot.find(s => s.targetId === 's1')!;

    expect(snap.costumeAssetId).toBe('asset_hash_123');
    expect(snap.costumeName).toBe('costume_name_abc');
  });

  it('11. should preserve snapshot immutability during asset changes', () => {
    const costumes = [{ id: 'c0', name: 'costume0', type: 'costume', assetId: 'h0', dataFormat: 'png' } as CostumeAsset];
    const sprite = makeSprite({ id: 's1', costumes, currentCostumeIndex: 0 });
    runtime.addTarget(sprite);

    const snapshot = runtime.getStageSnapshot();
    
    // Change costume on VM target
    sprite.currentCostumeIndex = 999;
    expect(snapshot[0].currentCostume).toBe(0); // snapshot array objects unaffected
  });

  it('12. should sweep registered references during initialize and stop purges', async () => {
    const costume: CostumeAsset = { id: 'c0', name: 'c0', type: 'costume', assetId: 'h0', dataFormat: 'png' };
    runtime.registerCostume(costume);

    expect(runtime.costumeRegistry.size).toBe(1);

    await runtime.initialize();
    expect(runtime.costumeRegistry.size).toBe(0);
  });

  it('13. should warn for malformed asset metadata and invalid data formats', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Malformed metadata missing name/fields
    runtime.registerCostume({ id: 'c0' } as any);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Runtime Diagnostics] malformed asset metadata')
    );

    // Invalid format
    const costume: CostumeAsset = { id: 'c1', name: 'c1', type: 'costume', assetId: 'a1', dataFormat: 'xyz' }; // non-standard
    runtime.registerCostume(costume);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Runtime Diagnostics] invalid dataFormat values')
    );

    warnSpy.mockRestore();
  });

  it('14. should preserve deterministic ordering inside registries', () => {
    const costume1: CostumeAsset = { id: 'c1', name: 'c1', type: 'costume', assetId: 'a1', dataFormat: 'png' };
    const costume2: CostumeAsset = { id: 'c2', name: 'c2', type: 'costume', assetId: 'a2', dataFormat: 'png' };

    runtime.registerCostume(costume1);
    runtime.registerCostume(costume2);

    const keys = Array.from(runtime.costumeRegistry.keys());
    expect(keys[0]).toBe('c1');
    expect(keys[1]).toBe('c2'); // matches registration FIFO sequence
  });

  it('15. should safely consume asset identifiers in renderer adapter', () => {
    const costumes = [{ id: 'c0', name: 'costume_name_abc', type: 'costume', assetId: 'asset_hash_123', dataFormat: 'png' } as CostumeAsset];
    const sprite = makeSprite({ id: 's1', costumes, currentCostumeIndex: 0 });
    runtime.addTarget(sprite);

    adapter.syncStage(runtime.getStageSnapshot());
    const target = adapter.targets.get('s1')!;

    expect(target.costumeAssetId).toBe('asset_hash_123');
    expect(target.costumeName).toBe('costume_name_abc');
  });

  it('16. should synchronize costume assets correctly after broadcast mutations', () => {
    const blocks = [
      makeBlock({
        id: 'hat',
        opcode: 'event_whenbroadcastreceived',
        topLevel: true,
        fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'swap' } },
        next: 'switch'
      }),
      makeBlock({ id: 'switch', opcode: 'looks_switchcostumeto', inputs: { COSTUME: { name: 'COSTUME', value: 1 } } })
    ];
    const costumes = [
      { id: 'c0', name: 'c0', type: 'costume', assetId: 'a0', dataFormat: 'png' } as CostumeAsset,
      { id: 'c1', name: 'c1', type: 'costume', assetId: 'a1', dataFormat: 'png' } as CostumeAsset
    ];
    const sprite = makeSprite({ id: 's1', costumes, currentCostumeIndex: 0, scripts: [makeScript('event_whenbroadcastreceived', blocks)] });
    runtime.addTarget(sprite);

    runtime.start();
    runtime.triggerBroadcast('swap');

    runtime.stepOnce();
    runtime.stepOnce();

    adapter.syncStage(runtime.getStageSnapshot());
    expect(adapter.targets.get('s1')?.costumeIndex).toBe(1);
    expect(adapter.targets.get('s1')?.costumeAssetId).toBe('a1');

    runtime.stop();
  });
});
