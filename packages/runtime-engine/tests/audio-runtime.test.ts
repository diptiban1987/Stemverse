import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { InMemoryRendererAdapter } from '../src/stage/renderer-adapter';
import { PixiRendererAdapter } from '../src/stage/pixi-renderer-adapter';
import { ASTBlock, ASTScript, SpriteState, SoundAsset, ActiveSoundTrigger } from '../src/types';
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

describe('Phase 7E — Audio & Music Runtime Integration Foundation', () => {
  let runtime: BaseRuntime;

  beforeEach(async () => {
    runtime = new BaseRuntime();
    await runtime.initialize();
    resetThreadCounter();
  });

  it('1. sound_play trigger enqueue', async () => {
    const sprite = makeSprite({
      id: 'cat',
      name: 'Cat',
      sounds: [
        {
          id: 'meow_id',
          name: 'meow',
          type: 'sound',
          assetId: 'asset_meow',
          dataFormat: 'wav',
          sampleRate: 44100,
          sampleCount: 22050 // 0.5s duration
        }
      ]
    });

    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'play_block' }),
      makeBlock({
        id: 'play_block',
        opcode: 'sound_play',
        fields: {
          SOUND_MENU: { name: 'SOUND_MENU', value: 'meow' }
        }
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    runtime.addTarget(sprite);
    runtime.start();
    runtime.tick();

    expect(runtime.activeSoundTriggers.length).toBe(1);
    const trigger = runtime.activeSoundTriggers[0];
    expect(trigger.soundId).toBe('meow_id');
    expect(trigger.soundName).toBe('meow');
    expect(trigger.targetId).toBe('cat');
    expect(trigger.durationMs).toBe(500);
    expect(trigger.completed).toBe(false);
  });

  it('2. sound_play non-blocking behavior', async () => {
    const sprite = makeSprite({
      id: 'cat',
      sounds: [
        {
          id: 'meow_id',
          name: 'meow',
          type: 'sound',
          assetId: 'asset_meow',
          dataFormat: 'wav',
          sampleRate: 44100,
          sampleCount: 22050
        }
      ]
    });

    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'play_block' }),
      makeBlock({
        id: 'play_block',
        opcode: 'sound_play',
        next: 'next_block',
        fields: { SOUND_MENU: { name: 'SOUND_MENU', value: 'meow' } }
      }),
      makeBlock({
        id: 'next_block',
        opcode: 'looks_show'
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    runtime.addTarget(sprite);
    runtime.start();
    
    // Tick 1: executes hat -> play_block -> next_block and completes thread (since non-blocking)
    runtime.tick();
    
    // Check that play was triggered
    expect(runtime.activeSoundTriggers.length).toBe(1);
    // Thread completed and was cleanly swept from activeThreads
    expect(runtime.activeThreads.length).toBe(0);
  });

  it('3. sound_playuntildone WAITING lifecycle', async () => {
    const sprite = makeSprite({
      id: 'cat',
      sounds: [
        {
          id: 'meow_id',
          name: 'meow',
          type: 'sound',
          assetId: 'asset_meow',
          dataFormat: 'wav',
          sampleRate: 44100,
          sampleCount: 22050 // 500ms
        }
      ]
    });

    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'play_done_block' }),
      makeBlock({
        id: 'play_done_block',
        opcode: 'sound_playuntildone',
        next: 'next_block',
        fields: { SOUND_MENU: { name: 'SOUND_MENU', value: 'meow' } }
      }),
      makeBlock({
        id: 'next_block',
        opcode: 'looks_show'
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    runtime.addTarget(sprite);
    runtime.start();
    
    // Tick 1: executes hat -> playuntildone block, enqueues trigger and sets state to WAITING
    runtime.tick();
    
    let thread = runtime.activeThreads[0];
    expect(thread).toBeDefined();
    expect(thread.status).toBe('WAITING');
    expect(thread.delayMs).toBe(500);
    expect(thread.waitingOnSoundId).toBeDefined();

    const tickDuration = 1000 / 30; // ~33.33ms

    // Fast-forward by ticks
    let elapsed = 0;
    while (elapsed < 500 - tickDuration) {
      runtime.tick();
      elapsed += tickDuration;
      thread = runtime.activeThreads[0];
      expect(thread.status).toBe('WAITING');
    }

    // Tick that crosses the 500ms boundary
    runtime.tick();
    thread = runtime.activeThreads[0];
    // Thread completes next_block and is swept
    expect(runtime.activeThreads.length).toBe(0);
  });

  it('4. waitingOnSoundId assignment', async () => {
    const sprite = makeSprite({
      id: 'cat',
      sounds: [
        {
          id: 'meow_id',
          name: 'meow',
          type: 'sound',
          assetId: 'asset_meow',
          dataFormat: 'wav',
          sampleRate: 1000,
          sampleCount: 100 // 100ms
        }
      ]
    });

    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'play_done_block' }),
      makeBlock({
        id: 'play_done_block',
        opcode: 'sound_playuntildone',
        next: 'next_block',
        fields: { SOUND_MENU: { name: 'SOUND_MENU', value: 'meow' } }
      }),
      makeBlock({
        id: 'next_block',
        opcode: 'looks_show'
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    runtime.addTarget(sprite);
    runtime.start();
    runtime.tick();

    const thread = runtime.activeThreads[0];
    expect(thread).toBeDefined();
    expect(thread.status).toBe('WAITING');
    expect(thread.waitingOnSoundId).toBe('sound_trigger_0');
  });

  it('5. sound duration metadata calculation', async () => {
    const sprite = makeSprite({
      id: 'cat',
      sounds: [
        {
          id: 'sound1',
          name: 'sound1',
          type: 'sound',
          assetId: 'asset_s1',
          dataFormat: 'wav',
          sampleRate: 8000,
          sampleCount: 16000 // 2.0 seconds = 2000ms
        }
      ]
    });

    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'play_block' }),
      makeBlock({
        id: 'play_block',
        opcode: 'sound_play',
        fields: { SOUND_MENU: { name: 'SOUND_MENU', value: 'sound1' } }
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    runtime.addTarget(sprite);
    runtime.start();
    runtime.tick();

    expect(runtime.activeSoundTriggers[0].durationMs).toBe(2000);
  });

  it('6. default duration fallback', async () => {
    const sprite = makeSprite({
      id: 'cat',
      sounds: [
        {
          id: 'sound1',
          name: 'sound1',
          type: 'sound',
          assetId: 'asset_s1',
          dataFormat: 'wav'
          // missing sampleRate and sampleCount
        }
      ]
    });

    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'play_block' }),
      makeBlock({
        id: 'play_block',
        opcode: 'sound_play',
        fields: { SOUND_MENU: { name: 'SOUND_MENU', value: 'sound1' } }
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    runtime.addTarget(sprite);
    runtime.start();
    runtime.tick();

    expect(runtime.activeSoundTriggers[0].durationMs).toBe(runtime.DEFAULT_SOUND_DURATION_MS);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('7. sound_stopallsounds cleanup', async () => {
    const sprite = makeSprite({
      id: 'cat',
      sounds: [
        {
          id: 'meow_id',
          name: 'meow',
          type: 'sound',
          assetId: 'asset_meow',
          dataFormat: 'wav',
          sampleRate: 44100,
          sampleCount: 22050
        }
      ]
    });

    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'play_done_block' }),
      makeBlock({
        id: 'play_done_block',
        opcode: 'sound_playuntildone',
        next: 'next_block',
        fields: { SOUND_MENU: { name: 'SOUND_MENU', value: 'meow' } }
      }),
      makeBlock({
        id: 'next_block',
        opcode: 'looks_show'
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    runtime.addTarget(sprite);
    runtime.start();
    runtime.tick();

    expect(runtime.activeSoundTriggers.length).toBe(1);
    expect(runtime.activeThreads[0].status).toBe('WAITING');

    runtime.stopAllSounds();

    // Centralized sweep cleanup immediately empties activeSoundTriggers in our updated stopAllSounds()!
    expect(runtime.activeSoundTriggers.length).toBe(0);
    expect(runtime.activeThreads[0].status).toBe('RUNNING');
    expect(runtime.activeThreads[0].waitingOnSoundId).toBeUndefined();
  });

  it('8. selective sound wait wake-up', async () => {
    const sprite = makeSprite({
      id: 'cat',
      sounds: [
        {
          id: 'meow_id',
          name: 'meow',
          type: 'sound',
          assetId: 'asset_meow',
          dataFormat: 'wav',
          sampleRate: 44100,
          sampleCount: 22050
        }
      ]
    });

    const blocks1 = [
      makeBlock({ id: 'hat1', opcode: 'event_whenflagclicked', topLevel: true, next: 'play_done_block' }),
      makeBlock({
        id: 'play_done_block',
        opcode: 'sound_playuntildone',
        next: 'next_block1',
        fields: { SOUND_MENU: { name: 'SOUND_MENU', value: 'meow' } }
      }),
      makeBlock({
        id: 'next_block1',
        opcode: 'looks_show'
      })
    ];
    // A standard control_wait thread
    const blocks2 = [
      makeBlock({ id: 'hat2', opcode: 'event_whenflagclicked', topLevel: true, next: 'wait_block' }),
      makeBlock({
        id: 'wait_block',
        opcode: 'control_wait',
        inputs: {
          DURATION: { name: 'DURATION', value: 10 }
        },
        next: 'next_block2'
      }),
      makeBlock({
        id: 'next_block2',
        opcode: 'looks_show'
      })
    ];
    sprite.scripts = [
      makeScript('event_whenflagclicked', blocks1),
      makeScript('event_whenflagclicked', blocks2)
    ];

    runtime.addTarget(sprite);
    runtime.start();
    runtime.tick();

    expect(runtime.activeThreads.length).toBe(2);
    const soundThread = runtime.activeThreads.find(t => t.topBlockId === 'hat1')!;
    const waitThread = runtime.activeThreads.find(t => t.topBlockId === 'hat2')!;

    expect(soundThread.status).toBe('WAITING');
    expect(soundThread.waitingOnSoundId).toBeDefined();
    expect(waitThread.status).toBe('WAITING');
    expect(waitThread.waitingOnSoundId).toBeUndefined();

    // stopallsounds should wake ONLY soundThread
    runtime.stopAllSounds();

    expect(soundThread.status).toBe('RUNNING');
    expect(waitThread.status).toBe('WAITING');
  });

  it('9. volume clamping', async () => {
    const sprite = makeSprite({ id: 'cat', volume: 80 });
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'set_vol_over' }),
      makeBlock({
        id: 'set_vol_over',
        opcode: 'sound_setvolumeto',
        inputs: { VOLUME: { name: 'VOLUME', value: 150 } },
        next: 'change_vol_under'
      }),
      makeBlock({
        id: 'change_vol_under',
        opcode: 'sound_changevolumeby',
        inputs: { VOLUME: { name: 'VOLUME', value: -200 } }
      })
    ];
    sprite.scripts = [makeScript('event_whenflagclicked', blocks)];

    runtime.addTarget(sprite);
    runtime.start();
    
    // Executes hat -> setvolumeto (clamped to 100) -> changevolumeby (clamped to 0) in 1 tick
    runtime.tick();
    expect(sprite.volume).toBe(0);
  });

  it('10. clone sound isolation', async () => {
    const sprite = makeSprite({
      id: 'parent',
      volume: 80,
      sounds: [
        {
          id: 'meow_id',
          name: 'meow',
          type: 'sound',
          assetId: 'asset_meow',
          dataFormat: 'wav',
          sampleRate: 44100,
          sampleCount: 22050
        }
      ]
    });
    runtime.addTarget(sprite);
    
    // Create clone
    runtime.createCloneOf('parent');
    
    const clone = runtime.getTargets().find(t => t.isClone)!;
    expect(clone).toBeDefined();
    expect(clone.volume).toBe(80); // inherited
    expect(clone.sounds.length).toBe(1); // inherited

    // Trigger sound on clone
    runtime.start();
    runtime.interpreter.onSoundTrigger!(clone.id, 'meow', false);

    expect(runtime.activeSoundTriggers.length).toBe(1);
    const trigger = runtime.activeSoundTriggers[0];
    expect(trigger.targetId).toBe(clone.id);

    // Verify channel states are isolated
    const parentChannel = runtime.soundChannels.get('parent');
    const cloneChannel = runtime.soundChannels.get(clone.id)!;
    
    expect(cloneChannel.activeTriggerIds.length).toBe(1);
    expect(parentChannel).toBeUndefined(); // parent never played sound
  });

  it('11. snapshot synchronization', async () => {
    const sprite = makeSprite({
      id: 'cat',
      volume: 75,
      sounds: [
        {
          id: 'meow_id',
          name: 'meow',
          type: 'sound',
          assetId: 'asset_meow',
          dataFormat: 'wav',
          sampleRate: 44100,
          sampleCount: 22050
        }
      ]
    });
    runtime.addTarget(sprite);
    runtime.start();

    // Trigger sound
    runtime.interpreter.onSoundTrigger!('cat', 'meow', false);

    const snapshot = runtime.getStageSnapshot();
    const snap = snapshot.find(s => s.targetId === 'cat')!;

    expect(snap.volume).toBe(75);
    expect(snap.activeSounds!.length).toBe(1);
    expect(snap.activeSounds![0].soundId).toBe('meow_id');
  });

  it('12. renderer ingestion', async () => {
    const sprite = makeSprite({
      id: 'cat',
      volume: 85,
      sounds: [
        {
          id: 'meow_id',
          name: 'meow',
          type: 'sound',
          assetId: 'asset_meow',
          dataFormat: 'wav',
          sampleRate: 44100,
          sampleCount: 22050
        }
      ]
    });
    runtime.addTarget(sprite);
    runtime.start();
    runtime.interpreter.onSoundTrigger!('cat', 'meow', false);

    const snapshot = runtime.getStageSnapshot();

    // 1. InMemoryRendererAdapter ingestion
    const inMemAdapter = new InMemoryRendererAdapter();
    inMemAdapter.initialize();
    inMemAdapter.syncStage(snapshot);

    const memTarget = inMemAdapter.targets.get('cat')!;
    expect(memTarget.volume).toBe(85);
    expect(memTarget.activeSounds!.length).toBe(1);
    expect(memTarget.activeSounds![0].soundId).toBe('meow_id');

    // 2. PixiRendererAdapter ingestion
    const pixiAdapter = new PixiRendererAdapter();
    pixiAdapter.initialize();
    pixiAdapter.syncStage(snapshot);

    const pixiTarget = pixiAdapter.targets.get('cat')!;
    expect(pixiTarget.volume).toBe(85);
    expect(pixiTarget.activeSounds!.length).toBe(1);
    expect(pixiTarget.activeSounds![0].soundId).toBe('meow_id');
  });

  it('13. orphan sound cleanup', async () => {
    const sprite = makeSprite({
      id: 'cat',
      sounds: [
        {
          id: 'meow_id',
          name: 'meow',
          type: 'sound',
          assetId: 'asset_meow',
          dataFormat: 'wav',
          sampleRate: 44100,
          sampleCount: 22050
        }
      ]
    });
    runtime.addTarget(sprite);
    runtime.start();
    runtime.interpreter.onSoundTrigger!('cat', 'meow', false);

    expect(runtime.activeSoundTriggers.length).toBe(1);
    expect(runtime.soundChannels.has('cat')).toBe(true);

    runtime.removeTarget('cat');

    expect(runtime.activeSoundTriggers.length).toBe(0);
    expect(runtime.soundChannels.has('cat')).toBe(false);
  });

  it('14. initialize()/stop() cleanup', async () => {
    const sprite = makeSprite({
      id: 'cat',
      sounds: [
        {
          id: 'meow_id',
          name: 'meow',
          type: 'sound',
          assetId: 'asset_meow',
          dataFormat: 'wav',
          sampleRate: 44100,
          sampleCount: 22050
        }
      ]
    });
    runtime.addTarget(sprite);
    runtime.start();
    runtime.interpreter.onSoundTrigger!('cat', 'meow', false);

    expect(runtime.activeSoundTriggers.length).toBe(1);
    expect(runtime.soundChannels.size).toBe(1);

    // Stop execution
    runtime.stop();

    expect(runtime.activeSoundTriggers.length).toBe(0);
    expect(runtime.soundChannels.size).toBe(0);
    expect(runtime.soundTriggerCounter).toBe(0);

    // Re-trigger and initialize
    runtime.start();
    runtime.interpreter.onSoundTrigger!('cat', 'meow', false);
    expect(runtime.activeSoundTriggers.length).toBe(1);

    await runtime.initialize();

    expect(runtime.activeSoundTriggers.length).toBe(0);
    expect(runtime.soundChannels.size).toBe(0);
    expect(runtime.soundTriggerCounter).toBe(0);
  });

  it('15. malformed sound metadata warnings', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sprite = makeSprite({
      id: 'cat',
      sounds: [
        {
          id: 'bad_sound',
          name: 'bad',
          type: 'sound',
          assetId: 'asset_bad',
          dataFormat: 'wav',
          sampleRate: -5, // invalid
          sampleCount: 1000
        }
      ]
    });
    runtime.addTarget(sprite);
    runtime.start();
    runtime.interpreter.onSoundTrigger!('cat', 'bad', false);

    expect(runtime.activeSoundTriggers[0].durationMs).toBe(runtime.DEFAULT_SOUND_DURATION_MS);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('16. deterministic trigger ordering', async () => {
    const sprite = makeSprite({
      id: 'cat',
      sounds: [
        {
          id: 'meow_id',
          name: 'meow',
          type: 'sound',
          assetId: 'asset_meow',
          dataFormat: 'wav',
          sampleRate: 44100,
          sampleCount: 22050
        },
        {
          id: 'purr_id',
          name: 'purr',
          type: 'sound',
          assetId: 'asset_purr',
          dataFormat: 'wav',
          sampleRate: 44100,
          sampleCount: 22050
        }
      ]
    });
    runtime.addTarget(sprite);
    runtime.start();

    // Trigger them sequentially
    runtime.interpreter.onSoundTrigger!('cat', 'meow', false);
    runtime.interpreter.onSoundTrigger!('cat', 'purr', false);

    expect(runtime.activeSoundTriggers.length).toBe(2);
    expect(runtime.activeSoundTriggers[0].soundId).toBe('meow_id');
    expect(runtime.activeSoundTriggers[1].soundId).toBe('purr_id');
  });
});
