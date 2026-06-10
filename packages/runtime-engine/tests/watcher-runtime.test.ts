import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { InMemoryRendererAdapter } from '../src/stage/renderer-adapter';
import { PixiRendererAdapter } from '../src/stage/pixi-renderer-adapter';
import { ASTBlock, ASTScript, SpriteState, VariableWatcher } from '../src/types';
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

describe('Phase 7G — Variable Watcher / Monitor Foundation', () => {
  let runtime: BaseRuntime;

  beforeEach(async () => {
    runtime = new BaseRuntime();
    await runtime.initialize();
    resetThreadCounter();
  });

  it('1. watcher registration', () => {
    const watcher: VariableWatcher = {
      id: 'w1',
      variableId: 'v1',
      targetId: 'cat',
      label: 'Score',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: 0
    };

    runtime.registerWatcher(watcher);
    const registered = runtime.getWatcher('w1');
    expect(registered).toBeDefined();
    expect(registered!.label).toBe('Score');
    expect(registered!.value).toBe(0);
  });

  it('2. watcher unregistration', () => {
    const watcher: VariableWatcher = {
      id: 'w1',
      variableId: 'v1',
      label: 'Score',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: 0
    };

    runtime.registerWatcher(watcher);
    expect(runtime.getWatcher('w1')).toBeDefined();

    runtime.unregisterWatcher('w1');
    expect(runtime.getWatcher('w1')).toBeUndefined();
  });

  it('3. deterministic watcher ordering', () => {
    const w1: VariableWatcher = {
      id: 'w1',
      variableId: 'v1',
      label: 'W1',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: 0
    };
    const w2: VariableWatcher = {
      id: 'w2',
      variableId: 'v2',
      label: 'W2',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: 0
    };

    runtime.registerWatcher(w2);
    runtime.registerWatcher(w1);

    const keys = Array.from(runtime.variableWatchers.keys());
    expect(keys).toEqual(['w2', 'w1']); // Map insertion order preserved
  });

  it('4. global variable synchronization', async () => {
    // Stage acting as global variable host
    const stage = makeSprite({ id: 'stage', isStage: true } as any);
    stage.variables['g_var_id'] = { id: 'g_var_id', name: 'global_var', value: 0 };
    await runtime.addTarget(stage);

    const watcher: VariableWatcher = {
      id: 'global_watcher',
      variableId: 'g_var_id',
      targetId: undefined, // global
      label: 'Global',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: 0
    };
    runtime.registerWatcher(watcher);

    const cat = makeSprite({ id: 'cat' });
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'set' }),
      makeBlock({
        id: 'set',
        opcode: 'data_setvariableto',
        fields: { VARIABLE: { name: 'VARIABLE', value: 'global_var' } },
        inputs: { VALUE: { name: 'VALUE', value: 42 } }
      })
    ];
    cat.scripts = [makeScript('event_whenflagclicked', blocks)];
    await runtime.addTarget(cat);

    runtime.start();
    runtime.tick();

    expect(stage.variables['g_var_id'].value).toBe(42);
    expect(runtime.getWatcher('global_watcher')!.value).toBe(42);
  });

  it('5. clone-local watcher synchronization', async () => {
    const parent = makeSprite({ id: 'parent', x: 0, y: 0 });
    parent.variables['local_id'] = { id: 'local_id', name: 'local_var', value: 10 };
    await runtime.addTarget(parent);

    const watcher: VariableWatcher = {
      id: 'local_watcher',
      variableId: 'local_id',
      targetId: 'parent',
      label: 'Local',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: 10
    };
    runtime.registerWatcher(watcher);

    runtime.createCloneOf('parent');
    const clone = runtime.getTargets().find(t => t.isClone)!;
    expect(clone).toBeDefined();

    // Verify clone-local watcher was dynamically spawned and registered
    const cloneWatcher = runtime.getWatcher(`local_watcher_clone_${clone.id}`);
    expect(cloneWatcher).toBeDefined();
    expect(cloneWatcher!.targetId).toBe(clone.id);
    expect(cloneWatcher!.value).toBe(10);

    // Mutate clone-local variable via interpreter callback
    runtime.interpreter.onVariableChanged!('local_id', clone.id, 99);

    // Check that clone-local watcher updated and parent watcher remained unchanged
    expect(runtime.getWatcher(`local_watcher_clone_${clone.id}`)!.value).toBe(99);
    expect(runtime.getWatcher('local_watcher')!.value).toBe(10);
  });

  it('6. watcher updates after broadcasts', async () => {
    const sprite = makeSprite({ id: 'cat' });
    sprite.variables['var_id'] = { id: 'var_id', name: 'my_var', value: 0 };
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenbroadcastreceived', topLevel: true, next: 'set' }),
      makeBlock({
        id: 'set',
        opcode: 'data_setvariableto',
        fields: { VARIABLE: { name: 'VARIABLE', value: 'my_var' } },
        inputs: { VALUE: { name: 'VALUE', value: 100 } }
      })
    ];
    blocks[0].fields = { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'ping' } };
    sprite.scripts = [makeScript('event_whenbroadcastreceived', blocks)];

    await runtime.addTarget(sprite);

    const watcher: VariableWatcher = {
      id: 'w1',
      variableId: 'var_id',
      targetId: 'cat',
      label: 'Var',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: 0
    };
    runtime.registerWatcher(watcher);

    runtime.start();
    runtime.triggerBroadcast('ping');
    runtime.tick();

    expect(runtime.getWatcher('w1')!.value).toBe(100);
  });

  it('7. watcher updates inside forever loops', async () => {
    const sprite = makeSprite({ id: 'cat' });
    sprite.variables['var_id'] = { id: 'var_id', name: 'my_var', value: 0 };
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop' }),
      makeBlock({
        id: 'loop',
        opcode: 'control_forever',
        inputs: {
          SUBSTACK: {
            name: 'SUBSTACK',
            value: 'change'
          }
        }
      }),
      makeBlock({
        id: 'change',
        opcode: 'data_changevariableby',
        fields: { VARIABLE: { name: 'VARIABLE', value: 'my_var' } },
        inputs: { VALUE: { name: 'VALUE', value: 5 } }
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];
    await runtime.addTarget(sprite);

    const watcher: VariableWatcher = {
      id: 'w1',
      variableId: 'var_id',
      targetId: 'cat',
      label: 'Var',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: 0
    };
    runtime.registerWatcher(watcher);

    runtime.start();
    
    // Tick 1: loop starts -> changes var by 5
    runtime.tick();
    expect(runtime.getWatcher('w1')!.value).toBe(5);

    // Tick 2: loop continues -> changes var by 5 again
    runtime.tick();
    expect(runtime.getWatcher('w1')!.value).toBe(10);
  });

  it('8. watcher persistence across waits', async () => {
    const sprite = makeSprite({ id: 'cat' });
    sprite.variables['var_id'] = { id: 'var_id', name: 'my_var', value: 0 };
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'wait' }),
      makeBlock({
        id: 'wait',
        opcode: 'control_wait',
        inputs: { DURATION: { name: 'DURATION', value: 0.1 } },
        next: 'set'
      }),
      makeBlock({
        id: 'set',
        opcode: 'data_setvariableto',
        fields: { VARIABLE: { name: 'VARIABLE', value: 'my_var' } },
        inputs: { VALUE: { name: 'VALUE', value: 77 } }
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];
    await runtime.addTarget(sprite);

    const watcher: VariableWatcher = {
      id: 'w1',
      variableId: 'var_id',
      targetId: 'cat',
      label: 'Var',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: 0
    };
    runtime.registerWatcher(watcher);

    runtime.start();
    
    // Tick 1: waits
    runtime.tick();
    expect(runtime.getWatcher('w1')!.value).toBe(0);

    // Tick 2: still waiting
    runtime.tick();
    expect(runtime.getWatcher('w1')!.value).toBe(0);

    // Tick 3: finishes wait, executes set
    runtime.tick();
    runtime.tick();
    expect(runtime.getWatcher('w1')!.value).toBe(77);
  });

  it('9. snapshot immutability', () => {
    const watcher: VariableWatcher = {
      id: 'w1',
      variableId: 'v1',
      label: 'Var',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: 0
    };
    runtime.registerWatcher(watcher);

    const snapshot = runtime.getStageSnapshot();
    expect(snapshot.length).toBe(0); // target list is empty

    // Add target to get valid snapshot pushes
    const sprite = makeSprite({ id: 'cat' });
    runtime.addTarget(sprite);

    const snapshot2 = runtime.getStageSnapshot();
    expect(snapshot2[0].watchers).toBeDefined();
    expect(snapshot2[0].watchers!.length).toBe(1);

    // Mutate snapshot watchers array
    snapshot2[0].watchers!.push({
      id: 'hacker',
      variableId: 'h1',
      label: 'Hack',
      visible: true,
      x: 0,
      y: 0,
      mode: 'DEFAULT',
      value: 999
    });

    // Verify runtime map remains unaffected
    expect(runtime.variableWatchers.size).toBe(1);
  });

  it('10. renderer ingestion', () => {
    const sprite = makeSprite({ id: 'cat' });
    sprite.variables['v1'] = { id: 'v1', name: 'var1', value: 50 };
    runtime.addTarget(sprite);

    const watcher: VariableWatcher = {
      id: 'w1',
      variableId: 'v1',
      targetId: 'cat',
      label: 'Var1',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: 50
    };
    runtime.registerWatcher(watcher);

    const snapshot = runtime.getStageSnapshot();

    // 1. InMemoryRendererAdapter ingestion
    const inMem = new InMemoryRendererAdapter();
    inMem.initialize();
    inMem.syncStage(snapshot);

    expect(inMem.targets.get('cat')!.watchers).toBeDefined();
    expect(inMem.targets.get('cat')!.watchers!.length).toBe(1);
    expect(inMem.targets.get('cat')!.watchers![0].value).toBe(50);

    // 2. PixiRendererAdapter ingestion
    const pixi = new PixiRendererAdapter();
    pixi.initialize();
    pixi.syncStage(snapshot);

    expect(pixi.targets.get('cat')!.watchers).toBeDefined();
    expect(pixi.targets.get('cat')!.watchers!.length).toBe(1);
    expect(pixi.targets.get('cat')!.watchers![0].value).toBe(50);
  });

  it('11. clone deletion cleanup', async () => {
    const parent = makeSprite({ id: 'parent' });
    parent.variables['v1'] = { id: 'v1', name: 'var1', value: 10 };
    await runtime.addTarget(parent);

    const watcher: VariableWatcher = {
      id: 'w1',
      variableId: 'v1',
      targetId: 'parent',
      label: 'Var1',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: 10
    };
    runtime.registerWatcher(watcher);

    runtime.createCloneOf('parent');
    const clone = runtime.getTargets().find(t => t.isClone)!;
    
    // Verify watcher cloned
    expect(runtime.getWatcher(`w1_clone_${clone.id}`)).toBeDefined();

    // Delete clone
    runtime.deleteClone(clone.id);

    // Verify clone watcher deleted but parent watcher remains
    expect(runtime.getWatcher(`w1_clone_${clone.id}`)).toBeUndefined();
    expect(runtime.getWatcher('w1')).toBeDefined();
  });

  it('12. initialize() cleanup', () => {
    const watcher: VariableWatcher = {
      id: 'w1',
      variableId: 'v1',
      label: 'Var',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: 0
    };
    runtime.registerWatcher(watcher);
    expect(runtime.variableWatchers.size).toBe(1);

    runtime.initialize();
    expect(runtime.variableWatchers.size).toBe(0);
  });

  it('13. stop() cleanup', () => {
    const watcher: VariableWatcher = {
      id: 'w1',
      variableId: 'v1',
      label: 'Var',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: 0
    };
    runtime.registerWatcher(watcher);
    expect(runtime.variableWatchers.size).toBe(1);

    runtime.stop();
    expect(runtime.variableWatchers.size).toBe(0);
  });

  it('14. malformed watcher warnings', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Missing ID
    runtime.registerWatcher({
      id: '',
      variableId: 'v1',
      label: 'L',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: 0
    });
    expect(warnSpy).toHaveBeenCalled();

    // Invalid coordinates (NaN)
    warnSpy.mockClear();
    runtime.registerWatcher({
      id: 'w_nan',
      variableId: 'v1',
      label: 'L',
      visible: true,
      x: NaN,
      y: 20,
      mode: 'DEFAULT',
      value: 0
    });
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('15. invalid slider range warnings', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Invalid slider limits (Min > Max)
    runtime.registerWatcher({
      id: 'w_slider',
      variableId: 'v1',
      label: 'Slider',
      visible: true,
      x: 10,
      y: 20,
      mode: 'SLIDER',
      sliderMin: 100,
      sliderMax: 0,
      value: 0
    });
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('16. deterministic watcher updates', () => {
    const watcher1: VariableWatcher = {
      id: 'w1',
      variableId: 'v1',
      targetId: 'cat',
      label: 'CatVar',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: 0
    };
    const watcher2: VariableWatcher = {
      id: 'w2',
      variableId: 'v1',
      targetId: 'dog',
      label: 'DogVar',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: 0
    };

    runtime.registerWatcher(watcher1);
    runtime.registerWatcher(watcher2);

    runtime.updateWatcherValue('v1', 'cat', 99);

    expect(runtime.getWatcher('w1')!.value).toBe(99);
    expect(runtime.getWatcher('w2')!.value).toBe(0); // Dog remains untouched
  });

  it('17. renderer isolation safety', () => {
    const sprite = makeSprite({ id: 'cat' });
    runtime.addTarget(sprite);

    const watcher: VariableWatcher = {
      id: 'w1',
      variableId: 'v1',
      targetId: 'cat',
      label: 'CatVar',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: 50
    };
    runtime.registerWatcher(watcher);

    const snapshot = runtime.getStageSnapshot();
    const inMem = new InMemoryRendererAdapter();
    inMem.initialize();
    inMem.syncStage(snapshot);

    // Mutate the synced target watchers property directly
    inMem.targets.get('cat')!.watchers![0].value = 1000;

    // Verify VM target watcher remains untouched
    expect(runtime.getWatcher('w1')!.value).toBe(50);
  });

  it('18. deep-copy synchronization safety', () => {
    const sprite = makeSprite({ id: 'cat' });
    runtime.addTarget(sprite);

    const watcher: VariableWatcher = {
      id: 'w1',
      variableId: 'v1',
      targetId: 'cat',
      label: 'CatVar',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: 50
    };
    runtime.registerWatcher(watcher);

    const snapshot = runtime.getStageSnapshot();
    
    // Mutate snapshot array directly
    snapshot[0].watchers![0].label = 'CHANGED';

    // Verify VM watcher remains safe and unaffected
    expect(runtime.getWatcher('w1')!.label).toBe('CatVar');
  });
});
