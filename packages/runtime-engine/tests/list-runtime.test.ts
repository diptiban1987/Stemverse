import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { InMemoryRendererAdapter } from '../src/stage/renderer-adapter';
import { PixiRendererAdapter } from '../src/stage/pixi-renderer-adapter';
import { ASTBlock, ASTScript, SpriteState, ListWatcher } from '../src/types';
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

describe('Phase 7H — List Runtime & List Watcher Foundation', () => {
  let runtime: BaseRuntime;

  beforeEach(async () => {
    runtime = new BaseRuntime();
    await runtime.initialize();
    resetThreadCounter();
  });

  it('1. list watcher registration', () => {
    const watcher: ListWatcher = {
      id: 'lw1',
      listId: 'l1',
      targetId: 'cat',
      label: 'Inventory',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: ['apple', 'banana']
    };

    runtime.registerListWatcher(watcher);
    const registered = runtime.getListWatcher('lw1');
    expect(registered).toBeDefined();
    expect(registered!.label).toBe('Inventory');
    expect(registered!.value).toEqual(['apple', 'banana']);
  });

  it('2. list watcher unregistration', () => {
    const watcher: ListWatcher = {
      id: 'lw1',
      listId: 'l1',
      label: 'Inventory',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: []
    };

    runtime.registerListWatcher(watcher);
    expect(runtime.getListWatcher('lw1')).toBeDefined();

    runtime.unregisterListWatcher('lw1');
    expect(runtime.getListWatcher('lw1')).toBeUndefined();
  });

  it('3. deterministic list watcher ordering', () => {
    const w1: ListWatcher = {
      id: 'lw1',
      listId: 'l1',
      label: 'W1',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: []
    };
    const w2: ListWatcher = {
      id: 'lw2',
      listId: 'l2',
      label: 'W2',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: []
    };

    runtime.registerListWatcher(w2);
    runtime.registerListWatcher(w1);

    // Verify Map insertion order is preserved (w2 then w1)
    const snapshot = runtime.getStageSnapshot();
    // Add target to get non-empty snapshot
    const sprite = makeSprite({ id: 'cat' });
    runtime.addTarget(sprite);

    const sn = runtime.getStageSnapshot();
    expect(sn[0].listWatchers).toBeDefined();
    expect(sn[0].listWatchers!.map(w => w.id)).toEqual(['lw2', 'lw1']);
  });

  it('4. add operation', async () => {
    const cat = makeSprite({ id: 'cat' });
    cat.lists['list_id'] = { id: 'list_id', name: 'my_list', value: [] };

    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'add' }),
      makeBlock({
        id: 'add',
        opcode: 'data_addtolist',
        fields: { LIST: { name: 'LIST', value: 'my_list' } },
        inputs: { ITEM: { name: 'ITEM', value: 'apple' } }
      })
    ];
    cat.scripts = [makeScript('event_whenflagclicked', blocks)];
    await runtime.addTarget(cat);

    runtime.start();
    runtime.tick();

    expect(cat.lists['list_id'].value).toEqual(['apple']);
  });

  it('5. delete operation', async () => {
    const cat = makeSprite({ id: 'cat' });
    cat.lists['list_id'] = { id: 'list_id', name: 'my_list', value: ['apple', 'banana', 'cherry'] };

    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'delete' }),
      makeBlock({
        id: 'delete',
        opcode: 'data_deleteoflist',
        fields: { LIST: { name: 'LIST', value: 'my_list' } },
        inputs: { INDEX: { name: 'INDEX', value: 2 } } // Deletes banana
      })
    ];
    cat.scripts = [makeScript('event_whenflagclicked', blocks)];
    await runtime.addTarget(cat);

    runtime.start();
    runtime.tick();

    expect(cat.lists['list_id'].value).toEqual(['apple', 'cherry']);
  });

  it('6. delete all operation', async () => {
    const cat = makeSprite({ id: 'cat' });
    cat.lists['list_id'] = { id: 'list_id', name: 'my_list', value: ['apple', 'banana'] };

    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'deleteall' }),
      makeBlock({
        id: 'deleteall',
        opcode: 'data_deletealloflist',
        fields: { LIST: { name: 'LIST', value: 'my_list' } }
      })
    ];
    cat.scripts = [makeScript('event_whenflagclicked', blocks)];
    await runtime.addTarget(cat);

    runtime.start();
    runtime.tick();

    expect(cat.lists['list_id'].value).toEqual([]);
  });

  it('7. insert operation', async () => {
    const cat = makeSprite({ id: 'cat' });
    cat.lists['list_id'] = { id: 'list_id', name: 'my_list', value: ['apple', 'cherry'] };

    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'insert' }),
      makeBlock({
        id: 'insert',
        opcode: 'data_insertatlist',
        fields: { LIST: { name: 'LIST', value: 'my_list' } },
        inputs: { INDEX: { name: 'INDEX', value: 2 }, ITEM: { name: 'ITEM', value: 'banana' } }
      })
    ];
    cat.scripts = [makeScript('event_whenflagclicked', blocks)];
    await runtime.addTarget(cat);

    runtime.start();
    runtime.tick();

    expect(cat.lists['list_id'].value).toEqual(['apple', 'banana', 'cherry']);
  });

  it('8. replace operation', async () => {
    const cat = makeSprite({ id: 'cat' });
    cat.lists['list_id'] = { id: 'list_id', name: 'my_list', value: ['apple', 'banana'] };

    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'replace' }),
      makeBlock({
        id: 'replace',
        opcode: 'data_replaceitemoflist',
        fields: { LIST: { name: 'LIST', value: 'my_list' } },
        inputs: { INDEX: { name: 'INDEX', value: 2 }, ITEM: { name: 'ITEM', value: 'cherry' } }
      })
    ];
    cat.scripts = [makeScript('event_whenflagclicked', blocks)];
    await runtime.addTarget(cat);

    runtime.start();
    runtime.tick();

    expect(cat.lists['list_id'].value).toEqual(['apple', 'cherry']);
  });

  it('9. Scratch 1-based index semantics and out-of-bounds safety', async () => {
    const cat = makeSprite({ id: 'cat' });
    cat.lists['list_id'] = { id: 'list_id', name: 'my_list', value: ['apple'] };

    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'replace_oob' }),
      makeBlock({
        id: 'replace_oob',
        opcode: 'data_replaceitemoflist',
        fields: { LIST: { name: 'LIST', value: 'my_list' } },
        inputs: { INDEX: { name: 'INDEX', value: 5 }, ITEM: { name: 'ITEM', value: 'banana' } } // OOB index, should warn and skip mutation
      })
    ];
    cat.scripts = [makeScript('event_whenflagclicked', blocks)];
    await runtime.addTarget(cat);

    runtime.start();
    runtime.tick();

    // No change should occur
    expect(cat.lists['list_id'].value).toEqual(['apple']);
  });

  it('10. string index "last" on delete', async () => {
    const cat = makeSprite({ id: 'cat' });
    cat.lists['list_id'] = { id: 'list_id', name: 'my_list', value: ['apple', 'banana'] };

    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'delete_last' }),
      makeBlock({
        id: 'delete_last',
        opcode: 'data_deleteoflist',
        fields: { LIST: { name: 'LIST', value: 'my_list' } },
        inputs: { INDEX: { name: 'INDEX', value: 'last' } }
      })
    ];
    cat.scripts = [makeScript('event_whenflagclicked', blocks)];
    await runtime.addTarget(cat);

    runtime.start();
    runtime.tick();

    expect(cat.lists['list_id'].value).toEqual(['apple']);
  });

  it('11. string index "all" on delete', async () => {
    const cat = makeSprite({ id: 'cat' });
    cat.lists['list_id'] = { id: 'list_id', name: 'my_list', value: ['apple', 'banana'] };

    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'delete_all' }),
      makeBlock({
        id: 'delete_all',
        opcode: 'data_deleteoflist',
        fields: { LIST: { name: 'LIST', value: 'my_list' } },
        inputs: { INDEX: { name: 'INDEX', value: 'all' } }
      })
    ];
    cat.scripts = [makeScript('event_whenflagclicked', blocks)];
    await runtime.addTarget(cat);

    runtime.start();
    runtime.tick();

    expect(cat.lists['list_id'].value).toEqual([]);
  });

  it('12. string index "last" on replace', async () => {
    const cat = makeSprite({ id: 'cat' });
    cat.lists['list_id'] = { id: 'list_id', name: 'my_list', value: ['apple', 'banana'] };

    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'replace_last' }),
      makeBlock({
        id: 'replace_last',
        opcode: 'data_replaceitemoflist',
        fields: { LIST: { name: 'LIST', value: 'my_list' } },
        inputs: { INDEX: { name: 'INDEX', value: 'last' }, ITEM: { name: 'ITEM', value: 'cherry' } }
      })
    ];
    cat.scripts = [makeScript('event_whenflagclicked', blocks)];
    await runtime.addTarget(cat);

    runtime.start();
    runtime.tick();

    expect(cat.lists['list_id'].value).toEqual(['apple', 'cherry']);
  });

  it('13. reporters evaluation: itemof, itemnumof, lengthof, contains', async () => {
    const cat = makeSprite({ id: 'cat' });
    cat.lists['list_id'] = { id: 'list_id', name: 'my_list', value: ['apple', 'banana'] };
    await runtime.addTarget(cat);

    const thread = runtime.activeThreads[0] || { id: 't1', targetId: 'cat', topBlockId: 'b1', status: 'RUNNING', stack: [], context: { targetId: 'cat', variables: {}, localScope: {} } };

    // 1. data_itemoflist
    const itemOfBlock = makeBlock({
      id: 'itemof',
      opcode: 'data_itemoflist',
      fields: { LIST: { name: 'LIST', value: 'my_list' } },
      inputs: { INDEX: { name: 'INDEX', value: 2 } }
    });
    expect(runtime.interpreter.evaluateReporter(thread as any, itemOfBlock)).toBe('banana');

    // 2. "last" index in itemof
    const itemLastBlock = makeBlock({
      id: 'itemlast',
      opcode: 'data_itemoflist',
      fields: { LIST: { name: 'LIST', value: 'my_list' } },
      inputs: { INDEX: { name: 'INDEX', value: 'last' } }
    });
    expect(runtime.interpreter.evaluateReporter(thread as any, itemLastBlock)).toBe('banana');

    // 3. data_itemnumoflist
    const itemNumBlock = makeBlock({
      id: 'itemnum',
      opcode: 'data_itemnumoflist',
      fields: { LIST: { name: 'LIST', value: 'my_list' } },
      inputs: { ITEM: { name: 'ITEM', value: 'banana' } }
    });
    expect(runtime.interpreter.evaluateReporter(thread as any, itemNumBlock)).toBe(2);

    // 4. data_lengthoflist
    const lengthBlock = makeBlock({
      id: 'length',
      opcode: 'data_lengthoflist',
      fields: { LIST: { name: 'LIST', value: 'my_list' } }
    });
    expect(runtime.interpreter.evaluateReporter(thread as any, lengthBlock)).toBe(2);

    // 5. data_listcontainsitem
    const containsBlock = makeBlock({
      id: 'contains',
      opcode: 'data_listcontainsitem',
      fields: { LIST: { name: 'LIST', value: 'my_list' } },
      inputs: { ITEM: { name: 'ITEM', value: 'APPLE' } } // case-insensitive check
    });
    expect(runtime.interpreter.evaluateReporter(thread as any, containsBlock)).toBe(true);
  });

  it('14. clone-local list isolation', async () => {
    const parent = makeSprite({ id: 'parent' });
    parent.lists['l_id'] = { id: 'l_id', name: 'local_list', value: ['apple'] };
    await runtime.addTarget(parent);

    runtime.createCloneOf('parent');
    const clone = runtime.getTargets().find(t => t.isClone)!;
    expect(clone).toBeDefined();

    // Verify clone list is populated with parent values but isolated
    expect(clone.lists['l_id'].value).toEqual(['apple']);

    // Mutate clone list
    clone.lists['l_id'].value.push('banana');

    // Verify isolation: clone modified, parent stays unchanged
    expect(clone.lists['l_id'].value).toEqual(['apple', 'banana']);
    expect(parent.lists['l_id'].value).toEqual(['apple']);
  });

  it('15. global list synchronization', async () => {
    // Stage hosts the global list
    const stage = makeSprite({ id: 'stage', isStage: true } as any);
    stage.lists['g_id'] = { id: 'g_id', name: 'global_list', value: ['apple'] };
    await runtime.addTarget(stage);

    const cat = makeSprite({ id: 'cat' });

    // Add to global list via interpreter execution on cat
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'add' }),
      makeBlock({
        id: 'add',
        opcode: 'data_addtolist',
        fields: { LIST: { name: 'LIST', value: 'global_list' } },
        inputs: { ITEM: { name: 'ITEM', value: 'banana' } }
      })
    ];
    cat.scripts = [makeScript('event_whenflagclicked', blocks)];
    await runtime.addTarget(cat);

    runtime.start();
    runtime.tick();

    // Both should see the updated global list
    expect(stage.lists['g_id'].value).toEqual(['apple', 'banana']);
  });

  it('16. watcher updates on mutation', async () => {
    const cat = makeSprite({ id: 'cat' });
    cat.lists['list_id'] = { id: 'list_id', name: 'my_list', value: [] };

    const watcher: ListWatcher = {
      id: 'lw1',
      listId: 'list_id',
      targetId: 'cat',
      label: 'My List',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: []
    };
    runtime.registerListWatcher(watcher);

    // Append to list via interpreter execution
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'add' }),
      makeBlock({
        id: 'add',
        opcode: 'data_addtolist',
        fields: { LIST: { name: 'LIST', value: 'my_list' } },
        inputs: { ITEM: { name: 'ITEM', value: 'apple' } }
      })
    ];
    cat.scripts = [makeScript('event_whenflagclicked', blocks)];
    await runtime.addTarget(cat);

    runtime.start();
    runtime.tick();

    // Verify watcher synced updated list array
    expect(runtime.getListWatcher('lw1')!.value).toEqual(['apple']);
  });

  it('17. clone-local watcher dynamic replicate', async () => {
    const parent = makeSprite({ id: 'parent' });
    parent.lists['list_id'] = { id: 'list_id', name: 'local_list', value: ['apple'] };
    await runtime.addTarget(parent);

    const watcher: ListWatcher = {
      id: 'lw1',
      listId: 'list_id',
      targetId: 'parent',
      label: 'Local List',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: ['apple']
    };
    runtime.registerListWatcher(watcher);

    runtime.createCloneOf('parent');
    const clone = runtime.getTargets().find(t => t.isClone)!;

    // Verify clone watcher was spawned and holds clone-local values
    const cloneWatcher = runtime.getListWatcher(`lw1_clone_${clone.id}`);
    expect(cloneWatcher).toBeDefined();
    expect(cloneWatcher!.targetId).toBe(clone.id);
    expect(cloneWatcher!.value).toEqual(['apple']);
  });

  it('18. clone deletion cleanup', async () => {
    const parent = makeSprite({ id: 'parent' });
    parent.lists['list_id'] = { id: 'list_id', name: 'local_list', value: ['apple'] };
    await runtime.addTarget(parent);

    const watcher: ListWatcher = {
      id: 'lw1',
      listId: 'list_id',
      targetId: 'parent',
      label: 'Local List',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: ['apple']
    };
    runtime.registerListWatcher(watcher);

    runtime.createCloneOf('parent');
    const clone = runtime.getTargets().find(t => t.isClone)!;

    expect(runtime.getListWatcher(`lw1_clone_${clone.id}`)).toBeDefined();

    runtime.deleteClone(clone.id);

    // Clone watcher must be cleaned up, parent stays
    expect(runtime.getListWatcher(`lw1_clone_${clone.id}`)).toBeUndefined();
    expect(runtime.getListWatcher('lw1')).toBeDefined();
  });

  it('19. initialize() and stop() cleans listWatchers', () => {
    const watcher: ListWatcher = {
      id: 'lw1',
      listId: 'l1',
      label: 'Inventory',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: []
    };
    runtime.registerListWatcher(watcher);

    runtime.stop();
    // Re-register
    runtime.registerListWatcher(watcher);
    expect(runtime.getListWatcher('lw1')).toBeDefined();

    runtime.initialize();
    expect(runtime.getListWatcher('lw1')).toBeUndefined();
  });

  it('20. snapshot deep-copy separation', () => {
    const cat = makeSprite({ id: 'cat' });
    cat.lists['list_id'] = { id: 'list_id', name: 'my_list', value: ['apple'] };
    runtime.addTarget(cat);

    const watcher: ListWatcher = {
      id: 'lw1',
      listId: 'list_id',
      targetId: 'cat',
      label: 'My List',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: ['apple']
    };
    runtime.registerListWatcher(watcher);

    const snapshot = runtime.getStageSnapshot();
    expect(snapshot[0].listWatchers).toBeDefined();
    expect(snapshot[0].listWatchers!.length).toBe(1);

    // Mutate snapshot array directly
    snapshot[0].listWatchers![0].value.push('hacked');

    // Verify VM list watcher values remain unaffected
    expect(runtime.getListWatcher('lw1')!.value).toEqual(['apple']);
  });

  it('21. renderer ingestion', () => {
    const cat = makeSprite({ id: 'cat' });
    cat.lists['list_id'] = { id: 'list_id', name: 'my_list', value: ['apple'] };
    runtime.addTarget(cat);

    const watcher: ListWatcher = {
      id: 'lw1',
      listId: 'list_id',
      targetId: 'cat',
      label: 'My List',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: ['apple']
    };
    runtime.registerListWatcher(watcher);

    const snapshot = runtime.getStageSnapshot();

    // 1. InMemoryRendererAdapter ingestion
    const inMem = new InMemoryRendererAdapter();
    inMem.initialize();
    inMem.syncStage(snapshot);
    expect(inMem.targets.get('cat')!.listWatchers).toBeDefined();
    expect(inMem.targets.get('cat')!.listWatchers![0].value).toEqual(['apple']);

    // 2. PixiRendererAdapter ingestion
    const pixi = new PixiRendererAdapter();
    pixi.initialize();
    pixi.syncStage(snapshot);
    expect(pixi.targets.get('cat')!.listWatchers).toBeDefined();
    expect(pixi.targets.get('cat')!.listWatchers![0].value).toEqual(['apple']);
  });

  it('22. malformed metadata warnings', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Missing ID
    runtime.registerListWatcher({
      id: '',
      listId: 'l1',
      label: 'L',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: []
    });
    expect(warnSpy).toHaveBeenCalled();

    // Invalid dimensions
    warnSpy.mockClear();
    runtime.registerListWatcher({
      id: 'lw_dim',
      listId: 'l1',
      label: 'L',
      visible: true,
      x: 10,
      y: 20,
      width: -50, // invalid width
      mode: 'DEFAULT',
      value: []
    });
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('23. broadcast/list cooperation', async () => {
    const cat = makeSprite({ id: 'cat' });
    cat.lists['list_id'] = { id: 'list_id', name: 'my_list', value: ['apple'] };
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenbroadcastreceived', topLevel: true, next: 'add' }),
      makeBlock({
        id: 'add',
        opcode: 'data_addtolist',
        fields: { LIST: { name: 'LIST', value: 'my_list' } },
        inputs: { ITEM: { name: 'ITEM', value: 'banana' } }
      })
    ];
    blocks[0].fields = { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'ping' } };
    cat.scripts = [makeScript('event_whenbroadcastreceived', blocks)];
    await runtime.addTarget(cat);

    runtime.start();
    runtime.triggerBroadcast('ping');
    runtime.tick();

    expect(cat.lists['list_id'].value).toEqual(['apple', 'banana']);
  });

  it('24. forever loop/list cooperation', async () => {
    const cat = makeSprite({ id: 'cat' });
    cat.lists['list_id'] = { id: 'list_id', name: 'my_list', value: [] };
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop' }),
      makeBlock({
        id: 'loop',
        opcode: 'control_forever',
        inputs: { SUBSTACK: { name: 'SUBSTACK', value: 'add' } }
      }),
      makeBlock({
        id: 'add',
        opcode: 'data_addtolist',
        fields: { LIST: { name: 'LIST', value: 'my_list' } },
        inputs: { ITEM: { name: 'ITEM', value: 'apple' } }
      })
    ];
    cat.scripts = [makeScript('event_whenflagclicked', blocks)];
    await runtime.addTarget(cat);

    runtime.start();

    // Tick 1: adds 'apple'
    runtime.tick();
    expect(cat.lists['list_id'].value).toEqual(['apple']);

    // Tick 2: adds 'apple' again
    runtime.tick();
    expect(cat.lists['list_id'].value).toEqual(['apple', 'apple']);
  });

  it('25. waits/list synchronization', async () => {
    const cat = makeSprite({ id: 'cat' });
    cat.lists['list_id'] = { id: 'list_id', name: 'my_list', value: [] };
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'wait' }),
      makeBlock({
        id: 'wait',
        opcode: 'control_wait',
        inputs: { DURATION: { name: 'DURATION', value: 0.1 } },
        next: 'add'
      }),
      makeBlock({
        id: 'add',
        opcode: 'data_addtolist',
        fields: { LIST: { name: 'LIST', value: 'my_list' } },
        inputs: { ITEM: { name: 'ITEM', value: 'apple' } }
      })
    ];
    cat.scripts = [makeScript('event_whenflagclicked', blocks)];
    await runtime.addTarget(cat);

    runtime.start();

    // Tick 1: starts wait
    runtime.tick();
    expect(cat.lists['list_id'].value).toEqual([]);

    // Tick 2: finishes wait, adds item
    runtime.tick();
    runtime.tick();
    runtime.tick();
    runtime.tick();
    expect(cat.lists['list_id'].value).toEqual(['apple']);
  });

  it('26. renderer isolation safety', () => {
    const cat = makeSprite({ id: 'cat' });
    cat.lists['list_id'] = { id: 'list_id', name: 'my_list', value: ['apple'] };
    runtime.addTarget(cat);

    const watcher: ListWatcher = {
      id: 'lw1',
      listId: 'list_id',
      targetId: 'cat',
      label: 'My List',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: ['apple']
    };
    runtime.registerListWatcher(watcher);

    const snapshot = runtime.getStageSnapshot();
    const inMem = new InMemoryRendererAdapter();
    inMem.initialize();
    inMem.syncStage(snapshot);

    // Mutate the synced target listWatchers directly in the adapter
    inMem.targets.get('cat')!.listWatchers![0].value.push('malicious');

    // Verify internal runtime list state remains untouched
    expect(runtime.getListWatcher('lw1')!.value).toEqual(['apple']);
  });

  it('27. nested list safety deep-copy', () => {
    const cat = makeSprite({ id: 'cat' });
    cat.lists['list_id'] = { id: 'list_id', name: 'my_list', value: [['nested1', 'nested2']] as any };
    runtime.addTarget(cat);

    const watcher: ListWatcher = {
      id: 'lw1',
      listId: 'list_id',
      targetId: 'cat',
      label: 'My List',
      visible: true,
      x: 10,
      y: 20,
      mode: 'DEFAULT',
      value: [['nested1', 'nested2']]
    };
    runtime.registerListWatcher(watcher);

    const snapshot = runtime.getStageSnapshot();
    
    // Attempt deep clone mutation on snapshot
    const nested = snapshot[0].listWatchers![0].value[0] as string[];
    nested.push('hacked');

    // VM list watcher should remain untouched (we use JSON deep clones for complex objects in list values!)
    expect(runtime.getListWatcher('lw1')!.value[0]).toEqual(['nested1', 'nested2']);
  });
});
