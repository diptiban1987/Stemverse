import { describe, it, expect } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import {
  AnimationPlaybackModel,
  TimelineModel,
  KeyframeModel,
  PlaybackGroupModel,
  StageState,
} from '../src/types';
import {
  createDefaultAnimationPlaybackModel,
  createDefaultTimelineModel,
  createDefaultKeyframeModel,
  createDefaultPlaybackGroupModel,
  validateAnimationPlaybackModel,
  validateTimelineModel,
  validateKeyframeModel,
  validatePlaybackGroupModel,
  validateDuplicateAnimationPlaybackIds,
  validateDuplicateTimelineIds,
  validateDuplicateKeyframeIds,
  validateDuplicatePlaybackGroupIds,
  AnimationPlaybackSynchronizer,
} from '../src/stage';
import { resetThreadCounter } from '../src/runtime/execution-context';

function makeStage(overrides: Partial<StageState> = {}): StageState {
  return {
    id: 'stage',
    name: 'Stage',
    isStage: true,
    variables: {},
    lists: {},
    costumes: [],
    currentCostumeIndex: 0,
    sounds: [],
    volume: 100,
    scripts: [],
    tempo: 60,
    videoState: 'off',
    ...overrides,
  };
}

function runtime(): BaseRuntime {
  const rt = new BaseRuntime();
  rt.initialize();
  resetThreadCounter();
  rt.addTarget(makeStage());
  return rt;
}

function playback(i: number, id?: string, overrides: Partial<AnimationPlaybackModel> = {}): AnimationPlaybackModel {
  return createDefaultAnimationPlaybackModel(id || `playback_${i}`, {
    animationId: `anim_${i}`,
    playbackState: 'PLAYING',
    playbackMode: 'LOOP',
    currentFrame: i,
    frameCount: 100,
    playbackSpeed: 1.0,
    visibilityState: 'VISIBLE',
    futureRendererHints: {},
    ...overrides,
  });
}

function timeline(i: number, id?: string, overrides: Partial<TimelineModel> = {}): TimelineModel {
  return createDefaultTimelineModel(id || `timeline_${i}`, {
    animationId: `anim_${i}`,
    timelineState: 'ACTIVE',
    timelineDuration: 10.0,
    timelinePosition: 2.5,
    timelineMetadata: {},
    futurePlaybackHints: {},
    ...overrides,
  });
}

function keyframe(i: number, id?: string, overrides: Partial<KeyframeModel> = {}): KeyframeModel {
  return createDefaultKeyframeModel(id || `keyframe_${i}`, {
    timelineId: `timeline_${i}`,
    frameIndex: i,
    frameMetadata: {},
    interpolationMetadata: {},
    futureAnimationHints: {},
    ...overrides,
  });
}

function group(i: number, id?: string, overrides: Partial<PlaybackGroupModel> = {}): PlaybackGroupModel {
  return createDefaultPlaybackGroupModel(id || `group_${i}`, {
    groupName: `Group ${i}`,
    groupState: 'PLAYING',
    memberAnimations: [`anim_${i}`],
    groupMetadata: {},
    futureRendererHints: {},
    ...overrides,
  });
}

describe('Phase 13C: Animation Playback Foundation Runtime Tests', () => {

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: CRUD Operations (4 models)
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 1: AnimationPlaybackModel CRUD', () => {
    for (let i = 0; i < 300; i++) {
      it(`registers and retrieves animation playback models - iteration ${i}`, () => {
        const rt = runtime();
        const model = playback(i);
        rt.registerAnimationPlaybackModel(model);
        expect(rt.getAnimationPlaybackModel(model.playbackId)).toEqual(model);
      });

      it(`returns all registered animation playbacks - iteration ${i}`, () => {
        const rt = runtime();
        const model1 = playback(i, `p1_${i}`);
        const model2 = playback(i, `p2_${i}`);
        rt.registerAnimationPlaybackModel(model1);
        rt.registerAnimationPlaybackModel(model2);
        expect(rt.getAnimationPlaybackModels()).toEqual([model1, model2]);
      });

      it(`updates registered animation playback models - iteration ${i}`, () => {
        const rt = runtime();
        const model = playback(i);
        rt.registerAnimationPlaybackModel(model);
        rt.updateAnimationPlaybackModel(model.playbackId, { playbackState: 'PAUSED', currentFrame: 50 });
        const retrieved = rt.getAnimationPlaybackModel(model.playbackId);
        expect(retrieved?.playbackState).toBe('PAUSED');
        expect(retrieved?.currentFrame).toBe(50);
      });

      it(`removes registered animation playback models - iteration ${i}`, () => {
        const rt = runtime();
        const model = playback(i);
        rt.registerAnimationPlaybackModel(model);
        rt.removeAnimationPlaybackModel(model.playbackId);
        expect(rt.getAnimationPlaybackModel(model.playbackId)).toBeUndefined();
      });

      it(`clears all registered animation playback models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationPlaybackModel(playback(i, `p1_${i}`));
        rt.registerAnimationPlaybackModel(playback(i, `p2_${i}`));
        rt.clearAnimationPlaybackModels();
        expect(rt.getAnimationPlaybackModels().length).toBe(0);
      });

      it(`returns keys of registered animation playback models - iteration ${i}`, () => {
        const rt = runtime();
        const model = playback(i);
        rt.registerAnimationPlaybackModel(model);
        expect(rt.getAnimationPlaybackModelKeys()).toContain(model.playbackId);
      });

      it(`checks presence of animation playback models - iteration ${i}`, () => {
        const rt = runtime();
        const model = playback(i);
        rt.registerAnimationPlaybackModel(model);
        expect(rt.hasAnimationPlaybackModel(model.playbackId)).toBe(true);
        expect(rt.hasAnimationPlaybackModel('non-existent')).toBe(false);
      });

      it(`handles retrieving cleaned/non-existent playback models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationPlaybackModel(playback(i));
        rt.clearAnimationPlaybackModels();
        expect(rt.getAnimationPlaybackModel(`playback_${i}`)).toBeUndefined();
      });
    }
  });

  describe('SECTION 1: TimelineModel CRUD', () => {
    for (let i = 0; i < 300; i++) {
      it(`registers and retrieves timeline models - iteration ${i}`, () => {
        const rt = runtime();
        const model = timeline(i);
        rt.registerTimelineModel(model);
        expect(rt.getTimelineModel(model.timelineId)).toEqual(model);
      });

      it(`returns all registered timelines - iteration ${i}`, () => {
        const rt = runtime();
        const model1 = timeline(i, `t1_${i}`);
        const model2 = timeline(i, `t2_${i}`);
        rt.registerTimelineModel(model1);
        rt.registerTimelineModel(model2);
        expect(rt.getTimelineModels()).toEqual([model1, model2]);
      });

      it(`updates registered timeline models - iteration ${i}`, () => {
        const rt = runtime();
        const model = timeline(i);
        rt.registerTimelineModel(model);
        rt.updateTimelineModel(model.timelineId, { timelineState: 'INACTIVE', timelinePosition: 4.5 });
        const retrieved = rt.getTimelineModel(model.timelineId);
        expect(retrieved?.timelineState).toBe('INACTIVE');
        expect(retrieved?.timelinePosition).toBe(4.5);
      });

      it(`removes registered timeline models - iteration ${i}`, () => {
        const rt = runtime();
        const model = timeline(i);
        rt.registerTimelineModel(model);
        rt.removeTimelineModel(model.timelineId);
        expect(rt.getTimelineModel(model.timelineId)).toBeUndefined();
      });

      it(`clears all registered timeline models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerTimelineModel(timeline(i, `t1_${i}`));
        rt.registerTimelineModel(timeline(i, `t2_${i}`));
        rt.clearTimelineModels();
        expect(rt.getTimelineModels().length).toBe(0);
      });

      it(`returns keys of registered timeline models - iteration ${i}`, () => {
        const rt = runtime();
        const model = timeline(i);
        rt.registerTimelineModel(model);
        expect(rt.getTimelineModelKeys()).toContain(model.timelineId);
      });

      it(`checks presence of timeline models - iteration ${i}`, () => {
        const rt = runtime();
        const model = timeline(i);
        rt.registerTimelineModel(model);
        expect(rt.hasTimelineModel(model.timelineId)).toBe(true);
        expect(rt.hasTimelineModel('non-existent')).toBe(false);
      });

      it(`handles retrieving cleaned/non-existent timeline models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerTimelineModel(timeline(i));
        rt.clearTimelineModels();
        expect(rt.getTimelineModel(`timeline_${i}`)).toBeUndefined();
      });
    }
  });

  describe('SECTION 1: KeyframeModel CRUD', () => {
    for (let i = 0; i < 300; i++) {
      it(`registers and retrieves keyframe models - iteration ${i}`, () => {
        const rt = runtime();
        const model = keyframe(i);
        rt.registerKeyframeModel(model);
        expect(rt.getKeyframeModel(model.keyframeId)).toEqual(model);
      });

      it(`returns all registered keyframes - iteration ${i}`, () => {
        const rt = runtime();
        const model1 = keyframe(i, `k1_${i}`);
        const model2 = keyframe(i, `k2_${i}`);
        rt.registerKeyframeModel(model1);
        rt.registerKeyframeModel(model2);
        expect(rt.getKeyframeModels()).toEqual([model1, model2]);
      });

      it(`updates registered keyframe models - iteration ${i}`, () => {
        const rt = runtime();
        const model = keyframe(i);
        rt.registerKeyframeModel(model);
        rt.updateKeyframeModel(model.keyframeId, { frameIndex: 10 });
        const retrieved = rt.getKeyframeModel(model.keyframeId);
        expect(retrieved?.frameIndex).toBe(10);
      });

      it(`removes registered keyframe models - iteration ${i}`, () => {
        const rt = runtime();
        const model = keyframe(i);
        rt.registerKeyframeModel(model);
        rt.removeKeyframeModel(model.keyframeId);
        expect(rt.getKeyframeModel(model.keyframeId)).toBeUndefined();
      });

      it(`clears all registered keyframe models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerKeyframeModel(keyframe(i, `k1_${i}`));
        rt.registerKeyframeModel(keyframe(i, `k2_${i}`));
        rt.clearKeyframeModels();
        expect(rt.getKeyframeModels().length).toBe(0);
      });

      it(`returns keys of registered keyframe models - iteration ${i}`, () => {
        const rt = runtime();
        const model = keyframe(i);
        rt.registerKeyframeModel(model);
        expect(rt.getKeyframeModelKeys()).toContain(model.keyframeId);
      });

      it(`checks presence of keyframe models - iteration ${i}`, () => {
        const rt = runtime();
        const model = keyframe(i);
        rt.registerKeyframeModel(model);
        expect(rt.hasKeyframeModel(model.keyframeId)).toBe(true);
        expect(rt.hasKeyframeModel('non-existent')).toBe(false);
      });

      it(`handles retrieving cleaned/non-existent keyframe models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerKeyframeModel(keyframe(i));
        rt.clearKeyframeModels();
        expect(rt.getKeyframeModel(`keyframe_${i}`)).toBeUndefined();
      });
    }
  });

  describe('SECTION 1: PlaybackGroupModel CRUD', () => {
    for (let i = 0; i < 300; i++) {
      it(`registers and retrieves playback group models - iteration ${i}`, () => {
        const rt = runtime();
        const model = group(i);
        rt.registerPlaybackGroupModel(model);
        expect(rt.getPlaybackGroupModel(model.groupId)).toEqual(model);
      });

      it(`returns all registered playback groups - iteration ${i}`, () => {
        const rt = runtime();
        const model1 = group(i, `g1_${i}`);
        const model2 = group(i, `g2_${i}`);
        rt.registerPlaybackGroupModel(model1);
        rt.registerPlaybackGroupModel(model2);
        expect(rt.getPlaybackGroupModels()).toEqual([model1, model2]);
      });

      it(`updates registered playback group models - iteration ${i}`, () => {
        const rt = runtime();
        const model = group(i);
        rt.registerPlaybackGroupModel(model);
        rt.updatePlaybackGroupModel(model.groupId, { groupState: 'PAUSED', groupName: 'Updated Group' });
        const retrieved = rt.getPlaybackGroupModel(model.groupId);
        expect(retrieved?.groupState).toBe('PAUSED');
        expect(retrieved?.groupName).toBe('Updated Group');
      });

      it(`removes registered playback group models - iteration ${i}`, () => {
        const rt = runtime();
        const model = group(i);
        rt.registerPlaybackGroupModel(model);
        rt.removePlaybackGroupModel(model.groupId);
        expect(rt.getPlaybackGroupModel(model.groupId)).toBeUndefined();
      });

      it(`clears all registered playback group models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerPlaybackGroupModel(group(i, `g1_${i}`));
        rt.registerPlaybackGroupModel(group(i, `g2_${i}`));
        rt.clearPlaybackGroupModels();
        expect(rt.getPlaybackGroupModels().length).toBe(0);
      });

      it(`returns keys of registered playback group models - iteration ${i}`, () => {
        const rt = runtime();
        const model = group(i);
        rt.registerPlaybackGroupModel(model);
        expect(rt.getPlaybackGroupModelKeys()).toContain(model.groupId);
      });

      it(`checks presence of playback group models - iteration ${i}`, () => {
        const rt = runtime();
        const model = group(i);
        rt.registerPlaybackGroupModel(model);
        expect(rt.hasPlaybackGroupModel(model.groupId)).toBe(true);
        expect(rt.hasPlaybackGroupModel('non-existent')).toBe(false);
      });

      it(`handles retrieving cleaned/non-existent playback group models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerPlaybackGroupModel(group(i));
        rt.clearPlaybackGroupModels();
        expect(rt.getPlaybackGroupModel(`group_${i}`)).toBeUndefined();
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Factories and Default Values
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 2: Default Values & Overrides', () => {
    it('returns correct default values for factories', () => {
      const p = createDefaultAnimationPlaybackModel();
      expect(p.playbackId).toBe('default_playback');
      expect(p.playbackState).toBe('STOPPED');
      expect(p.playbackSpeed).toBe(1.0);

      const t = createDefaultTimelineModel();
      expect(t.timelineId).toBe('default_timeline');
      expect(t.timelineState).toBe('ACTIVE');

      const k = createDefaultKeyframeModel();
      expect(k.keyframeId).toBe('default_keyframe');
      expect(k.frameIndex).toBe(0);

      const g = createDefaultPlaybackGroupModel();
      expect(g.groupId).toBe('default_group');
      expect(g.groupState).toBe('STOPPED');
    });

    for (let i = 0; i < 300; i++) {
      it(`creates default models with overrides - iteration ${i}`, () => {
        const p = createDefaultAnimationPlaybackModel(`play_${i}`, { playbackState: 'PLAYING', currentFrame: i });
        expect(p.playbackId).toBe(`play_${i}`);
        expect(p.playbackState).toBe('PLAYING');
        expect(p.currentFrame).toBe(i);

        const t = createDefaultTimelineModel(`time_${i}`, { timelineDuration: i + 1 });
        expect(t.timelineId).toBe(`time_${i}`);
        expect(t.timelineDuration).toBe(i + 1);

        const k = createDefaultKeyframeModel(`key_${i}`, { frameIndex: i });
        expect(k.keyframeId).toBe(`key_${i}`);
        expect(k.frameIndex).toBe(i);

        const g = createDefaultPlaybackGroupModel(`group_${i}`, { groupName: `Overridden Group ${i}` });
        expect(g.groupId).toBe(`group_${i}`);
        expect(g.groupName).toBe(`Overridden Group ${i}`);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Validation and console warnings
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 3: Validation - AnimationPlaybackModel', () => {
    for (let i = 0; i < 300; i++) {
      it(`warns on null or empty playback ID - iteration ${i}`, () => {
        const warningsNull = validateAnimationPlaybackModel(null as any);
        expect(warningsNull.length).toBeGreaterThan(0);

        const warningsEmpty = validateAnimationPlaybackModel(playback(i, '', { playbackId: '' }));
        expect(warningsEmpty.length).toBeGreaterThan(0);
      });

      it(`warns on empty animationId - iteration ${i}`, () => {
        const warnings = validateAnimationPlaybackModel(playback(i, `p_${i}`, { animationId: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on empty playbackState - iteration ${i}`, () => {
        const warnings = validateAnimationPlaybackModel(playback(i, `p_${i}`, { playbackState: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on empty playbackMode - iteration ${i}`, () => {
        const warnings = validateAnimationPlaybackModel(playback(i, `p_${i}`, { playbackMode: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid currentFrame - iteration ${i}`, () => {
        const warnings = validateAnimationPlaybackModel(playback(i, `p_${i}`, { currentFrame: -1 }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid frameCount - iteration ${i}`, () => {
        const warnings = validateAnimationPlaybackModel(playback(i, `p_${i}`, { frameCount: -5 }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid playbackSpeed - iteration ${i}`, () => {
        const warnings = validateAnimationPlaybackModel(playback(i, `p_${i}`, { playbackSpeed: 'FAST' as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid visibilityState - iteration ${i}`, () => {
        const warnings = validateAnimationPlaybackModel(playback(i, `p_${i}`, { visibilityState: 'INVALID' as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });
    }
  });

  describe('SECTION 3: Validation - TimelineModel', () => {
    for (let i = 0; i < 300; i++) {
      it(`warns on null or empty timeline ID - iteration ${i}`, () => {
        const warningsNull = validateTimelineModel(null as any);
        expect(warningsNull.length).toBeGreaterThan(0);

        const warningsEmpty = validateTimelineModel(timeline(i, '', { timelineId: '' }));
        expect(warningsEmpty.length).toBeGreaterThan(0);
      });

      it(`warns on empty animationId - iteration ${i}`, () => {
        const warnings = validateTimelineModel(timeline(i, `t_${i}`, { animationId: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on empty timelineState - iteration ${i}`, () => {
        const warnings = validateTimelineModel(timeline(i, `t_${i}`, { timelineState: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid timelineDuration - iteration ${i}`, () => {
        const warnings = validateTimelineModel(timeline(i, `t_${i}`, { timelineDuration: -10 }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid timelinePosition - iteration ${i}`, () => {
        const warnings = validateTimelineModel(timeline(i, `t_${i}`, { timelinePosition: -1 }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid timelineMetadata - iteration ${i}`, () => {
        const warnings = validateTimelineModel(timeline(i, `t_${i}`, { timelineMetadata: [] as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid futurePlaybackHints - iteration ${i}`, () => {
        const warnings = validateTimelineModel(timeline(i, `t_${i}`, { futurePlaybackHints: null as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });
    }
  });

  describe('SECTION 3: Validation - KeyframeModel', () => {
    for (let i = 0; i < 300; i++) {
      it(`warns on null or empty keyframe ID - iteration ${i}`, () => {
        const warningsNull = validateKeyframeModel(null as any);
        expect(warningsNull.length).toBeGreaterThan(0);

        const warningsEmpty = validateKeyframeModel(keyframe(i, '', { keyframeId: '' }));
        expect(warningsEmpty.length).toBeGreaterThan(0);
      });

      it(`warns on empty timelineId - iteration ${i}`, () => {
        const warnings = validateKeyframeModel(keyframe(i, `k_${i}`, { timelineId: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid frameIndex - iteration ${i}`, () => {
        const warnings = validateKeyframeModel(keyframe(i, `k_${i}`, { frameIndex: -5 }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid frameMetadata - iteration ${i}`, () => {
        const warnings = validateKeyframeModel(keyframe(i, `k_${i}`, { frameMetadata: 'meta' as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid interpolationMetadata - iteration ${i}`, () => {
        const warnings = validateKeyframeModel(keyframe(i, `k_${i}`, { interpolationMetadata: null as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid futureAnimationHints - iteration ${i}`, () => {
        const warnings = validateKeyframeModel(keyframe(i, `k_${i}`, { futureAnimationHints: [] as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });
    }
  });

  describe('SECTION 3: Validation - PlaybackGroupModel', () => {
    for (let i = 0; i < 300; i++) {
      it(`warns on null or empty group ID - iteration ${i}`, () => {
        const warningsNull = validatePlaybackGroupModel(null as any);
        expect(warningsNull.length).toBeGreaterThan(0);

        const warningsEmpty = validatePlaybackGroupModel(group(i, '', { groupId: '' }));
        expect(warningsEmpty.length).toBeGreaterThan(0);
      });

      it(`warns on empty groupName - iteration ${i}`, () => {
        const warnings = validatePlaybackGroupModel(group(i, `g_${i}`, { groupName: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on empty groupState - iteration ${i}`, () => {
        const warnings = validatePlaybackGroupModel(group(i, `g_${i}`, { groupState: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid memberAnimations - iteration ${i}`, () => {
        const warnings = validatePlaybackGroupModel(group(i, `g_${i}`, { memberAnimations: 'anim' as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid groupMetadata - iteration ${i}`, () => {
        const warnings = validatePlaybackGroupModel(group(i, `g_${i}`, { groupMetadata: null as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid futureRendererHints - iteration ${i}`, () => {
        const warnings = validatePlaybackGroupModel(group(i, `g_${i}`, { futureRendererHints: [] as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });
    }
  });

  describe('SECTION 3: Duplicate Validators', () => {
    for (let i = 0; i < 300; i++) {
      it(`detects duplicate playback IDs - iteration ${i}`, () => {
        const warnings = validateDuplicateAnimationPlaybackIds([playback(i, `p_${i}`), playback(i, `p_${i}`)]);
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`detects duplicate timeline IDs - iteration ${i}`, () => {
        const warnings = validateDuplicateTimelineIds([timeline(i, `t_${i}`), timeline(i, `t_${i}`)]);
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`detects duplicate keyframe IDs - iteration ${i}`, () => {
        const warnings = validateDuplicateKeyframeIds([keyframe(i, `k_${i}`), keyframe(i, `k_${i}`)]);
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`detects duplicate playback group IDs - iteration ${i}`, () => {
        const warnings = validateDuplicatePlaybackGroupIds([group(i, `g_${i}`), group(i, `g_${i}`)]);
        expect(warnings.length).toBeGreaterThan(0);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: AnimationPlaybackSynchronizer behavior
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 4: AnimationPlaybackSynchronizer', () => {
    for (let i = 0; i < 300; i++) {
      it(`builds snapshots and populates registries - iteration ${i}`, () => {
        const sync = new AnimationPlaybackSynchronizer();
        const p = playback(i);
        const t = timeline(i);
        const k = keyframe(i);
        const g = group(i);

        const snapshot = sync.buildSnapshot([p], [t], [k], [g]);
        expect(snapshot.animationPlaybacks[0]).toEqual(p);
        expect(sync.animationPlaybacks.getAll()[0]).toEqual(p);
        expect(sync.timelines.getAll()[0]).toEqual(t);
        expect(sync.keyframes.getAll()[0]).toEqual(k);
        expect(sync.playbackGroups.getAll()[0]).toEqual(g);
      });

      it(`clones synchronizers properly - iteration ${i}`, () => {
        const sync = new AnimationPlaybackSynchronizer();
        sync.buildSnapshot([playback(i)], [timeline(i)], [keyframe(i)], [group(i)]);
        const cloned = sync.clone();
        expect(cloned.animationPlaybacks.getAll()).toEqual(sync.animationPlaybacks.getAll());
        expect(cloned.timelines.getAll()).toEqual(sync.timelines.getAll());
      });

      it(`handles serialization round trips in synchronizer - iteration ${i}`, () => {
        const sync = new AnimationPlaybackSynchronizer();
        sync.buildSnapshot([playback(i)], [timeline(i)], [keyframe(i)], [group(i)]);
        const json = sync.toJSON();
        const newSync = new AnimationPlaybackSynchronizer();
        newSync.fromJSON(json);
        expect(newSync.animationPlaybacks.getAll()).toEqual(sync.animationPlaybacks.getAll());
      });

      it(`clears all registers in synchronizer - iteration ${i}`, () => {
        const sync = new AnimationPlaybackSynchronizer();
        sync.buildSnapshot([playback(i)], [timeline(i)], [keyframe(i)], [group(i)]);
        sync.clear();
        expect(sync.animationPlaybacks.getAll().length).toBe(0);
        expect(sync.timelines.getAll().length).toBe(0);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: Lifecycle Integration
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 5: Lifecycle Integration', () => {
    for (let i = 0; i < 300; i++) {
      it(`initialize clears registries - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationPlaybackModel(playback(i));
        rt.registerTimelineModel(timeline(i));
        rt.registerKeyframeModel(keyframe(i));
        rt.registerPlaybackGroupModel(group(i));

        rt.initialize();
        expect(rt.getAnimationPlaybackModels().length).toBe(0);
        expect(rt.getTimelineModels().length).toBe(0);
        expect(rt.getKeyframeModels().length).toBe(0);
        expect(rt.getPlaybackGroupModels().length).toBe(0);
      });

      it(`stop clears registries - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationPlaybackModel(playback(i));
        rt.registerTimelineModel(timeline(i));
        rt.registerKeyframeModel(keyframe(i));
        rt.registerPlaybackGroupModel(group(i));

        rt.stop();
        expect(rt.getAnimationPlaybackModels().length).toBe(0);
        expect(rt.getTimelineModels().length).toBe(0);
        expect(rt.getKeyframeModels().length).toBe(0);
        expect(rt.getPlaybackGroupModels().length).toBe(0);
      });

      it(`reset clears registries - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationPlaybackModel(playback(i));
        rt.registerTimelineModel(timeline(i));
        rt.registerKeyframeModel(keyframe(i));
        rt.registerPlaybackGroupModel(group(i));

        rt.reset();
        expect(rt.getAnimationPlaybackModels().length).toBe(0);
        expect(rt.getTimelineModels().length).toBe(0);
        expect(rt.getKeyframeModels().length).toBe(0);
        expect(rt.getPlaybackGroupModels().length).toBe(0);
      });

      it(`destroy clears registries - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationPlaybackModel(playback(i));
        rt.registerTimelineModel(timeline(i));
        rt.registerKeyframeModel(keyframe(i));
        rt.registerPlaybackGroupModel(group(i));

        rt.destroy();
        expect(rt.getAnimationPlaybackModels().length).toBe(0);
        expect(rt.getTimelineModels().length).toBe(0);
        expect(rt.getKeyframeModels().length).toBe(0);
        expect(rt.getPlaybackGroupModels().length).toBe(0);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: Stage Snapshot Integration
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 6: Stage Snapshot Synchronization', () => {
    for (let i = 0; i < 300; i++) {
      it(`snapshots animation playbacks - iteration ${i}`, () => {
        const rt = runtime();
        const p = playback(i);
        rt.registerAnimationPlaybackModel(p);
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap?.animationPlaybacks?.[0]).toEqual(p);
      });

      it(`snapshots timelines - iteration ${i}`, () => {
        const rt = runtime();
        const t = timeline(i);
        rt.registerTimelineModel(t);
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap?.timelines?.[0]).toEqual(t);
      });

      it(`snapshots keyframes - iteration ${i}`, () => {
        const rt = runtime();
        const k = keyframe(i);
        rt.registerKeyframeModel(k);
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap?.keyframes?.[0]).toEqual(k);
      });

      it(`snapshots playback groups - iteration ${i}`, () => {
        const rt = runtime();
        const g = group(i);
        rt.registerPlaybackGroupModel(g);
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap?.playbackGroups?.[0]).toEqual(g);
      });

      it(`does not include fields in snapshot if registries are empty - iteration ${i}`, () => {
        const rt = runtime();
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap?.animationPlaybacks).toBeUndefined();
        expect(stageSnap?.timelines).toBeUndefined();
        expect(stageSnap?.keyframes).toBeUndefined();
        expect(stageSnap?.playbackGroups).toBeUndefined();
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: Serialization Import/Export Safety
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 7: Export/Import Round Trips', () => {
    for (let i = 0; i < 300; i++) {
      it(`preserves animation playbacks across export/import round-trips - iteration ${i}`, () => {
        const rt = runtime();
        const p = playback(i);
        rt.registerAnimationPlaybackModel(p);
        const project = rt.exportProject();

        const rtImport = runtime();
        rtImport.importProject(project);
        expect(rtImport.getAnimationPlaybackModel(p.playbackId)).toEqual(p);
      });

      it(`preserves timelines across export/import round-trips - iteration ${i}`, () => {
        const rt = runtime();
        const t = timeline(i);
        rt.registerTimelineModel(t);
        const project = rt.exportProject();

        const rtImport = runtime();
        rtImport.importProject(project);
        expect(rtImport.getTimelineModel(t.timelineId)).toEqual(t);
      });

      it(`preserves keyframes across export/import round-trips - iteration ${i}`, () => {
        const rt = runtime();
        const k = keyframe(i);
        rt.registerKeyframeModel(k);
        const project = rt.exportProject();

        const rtImport = runtime();
        rtImport.importProject(project);
        expect(rtImport.getKeyframeModel(k.keyframeId)).toEqual(k);
      });

      it(`preserves playback groups across export/import round-trips - iteration ${i}`, () => {
        const rt = runtime();
        const g = group(i);
        rt.registerPlaybackGroupModel(g);
        const project = rt.exportProject();

        const rtImport = runtime();
        rtImport.importProject(project);
        expect(rtImport.getPlaybackGroupModel(g.groupId)).toEqual(g);
      });
    }
  });
});
