import {
  AnimationPlaybackModel,
  TimelineModel,
  KeyframeModel,
  PlaybackGroupModel,
  VisibilityState,
  AnimationPlaybackSnapshot,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

const DEFAULT_VISIBILITY_STATE: VisibilityState = 'VISIBLE';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createDefaultAnimationPlaybackModel(
  playbackId = 'default_playback',
  overrides: Partial<AnimationPlaybackModel> = {},
): AnimationPlaybackModel {
  return {
    playbackId,
    animationId: `anim_${playbackId}`,
    playbackState: 'STOPPED',
    playbackMode: 'ONCE',
    currentFrame: 0,
    frameCount: 0,
    playbackSpeed: 1.0,
    visibilityState: DEFAULT_VISIBILITY_STATE,
    futureRendererHints: {},
    ...overrides,
  };
}

export function createDefaultTimelineModel(
  timelineId = 'default_timeline',
  overrides: Partial<TimelineModel> = {},
): TimelineModel {
  return {
    timelineId,
    animationId: `anim_${timelineId}`,
    timelineState: 'ACTIVE',
    timelineDuration: 0,
    timelinePosition: 0,
    timelineMetadata: {},
    futurePlaybackHints: {},
    ...overrides,
  };
}

export function createDefaultKeyframeModel(
  keyframeId = 'default_keyframe',
  overrides: Partial<KeyframeModel> = {},
): KeyframeModel {
  return {
    keyframeId,
    timelineId: `timeline_${keyframeId}`,
    frameIndex: 0,
    frameMetadata: {},
    interpolationMetadata: {},
    futureAnimationHints: {},
    ...overrides,
  };
}

export function createDefaultPlaybackGroupModel(
  groupId = 'default_group',
  overrides: Partial<PlaybackGroupModel> = {},
): PlaybackGroupModel {
  return {
    groupId,
    groupName: `Group ${groupId}`,
    groupState: 'STOPPED',
    memberAnimations: [],
    groupMetadata: {},
    futureRendererHints: {},
    ...overrides,
  };
}

const VALID_VISIBILITY_STATES: VisibilityState[] = [
  'VISIBLE', 'HIDDEN', 'PARENT_HIDDEN',
];

export function validateAnimationPlaybackModel(
  model: AnimationPlaybackModel,
  warnPrefix = '[AnimationPlayback]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_PLAYBACK', message: 'Animation playback model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.playbackId) {
    warnings.push({ code: 'INVALID_PLAYBACK_ID', message: 'Animation playback ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.animationId) {
    warnings.push({ code: 'INVALID_ANIMATION_ID', message: `Animation playback "${model.playbackId}" has empty animationId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.playbackState) {
    warnings.push({ code: 'INVALID_PLAYBACK_STATE', message: `Animation playback "${model.playbackId}" has empty playbackState.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.playbackMode) {
    warnings.push({ code: 'INVALID_PLAYBACK_MODE', message: `Animation playback "${model.playbackId}" has empty playbackMode.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.currentFrame !== 'number' || model.currentFrame < 0) {
    warnings.push({ code: 'INVALID_CURRENT_FRAME', message: `Animation playback "${model.playbackId}" has invalid currentFrame.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.frameCount !== 'number' || model.frameCount < 0) {
    warnings.push({ code: 'INVALID_FRAME_COUNT', message: `Animation playback "${model.playbackId}" has invalid frameCount.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.playbackSpeed !== 'number') {
    warnings.push({ code: 'INVALID_PLAYBACK_SPEED', message: `Animation playback "${model.playbackId}" has invalid playbackSpeed.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_VISIBILITY_STATES.includes(model.visibilityState)) {
    warnings.push({ code: 'INVALID_VISIBILITY_STATE', message: `Animation playback "${model.playbackId}" has invalid visibilityState "${model.visibilityState}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureRendererHints !== 'object' || model.futureRendererHints === null || Array.isArray(model.futureRendererHints)) {
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `Animation playback "${model.playbackId}" has invalid futureRendererHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateTimelineModel(
  model: TimelineModel,
  warnPrefix = '[AnimationPlayback]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_TIMELINE', message: 'Timeline model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.timelineId) {
    warnings.push({ code: 'INVALID_TIMELINE_ID', message: 'Timeline ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.animationId) {
    warnings.push({ code: 'INVALID_ANIMATION_ID', message: `Timeline "${model.timelineId}" has empty animationId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.timelineState) {
    warnings.push({ code: 'INVALID_TIMELINE_STATE', message: `Timeline "${model.timelineId}" has empty timelineState.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.timelineDuration !== 'number' || model.timelineDuration < 0) {
    warnings.push({ code: 'INVALID_TIMELINE_DURATION', message: `Timeline "${model.timelineId}" has invalid timelineDuration.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.timelinePosition !== 'number' || model.timelinePosition < 0) {
    warnings.push({ code: 'INVALID_TIMELINE_POSITION', message: `Timeline "${model.timelineId}" has invalid timelinePosition.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.timelineMetadata !== 'object' || model.timelineMetadata === null || Array.isArray(model.timelineMetadata)) {
    warnings.push({ code: 'INVALID_TIMELINE_METADATA', message: `Timeline "${model.timelineId}" has invalid timelineMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futurePlaybackHints !== 'object' || model.futurePlaybackHints === null || Array.isArray(model.futurePlaybackHints)) {
    warnings.push({ code: 'INVALID_FUTURE_PLAYBACK_HINTS', message: `Timeline "${model.timelineId}" has invalid futurePlaybackHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateKeyframeModel(
  model: KeyframeModel,
  warnPrefix = '[AnimationPlayback]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_KEYFRAME', message: 'Keyframe model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.keyframeId) {
    warnings.push({ code: 'INVALID_KEYFRAME_ID', message: 'Keyframe ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.timelineId) {
    warnings.push({ code: 'INVALID_TIMELINE_ID', message: `Keyframe "${model.keyframeId}" has empty timelineId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.frameIndex !== 'number' || model.frameIndex < 0) {
    warnings.push({ code: 'INVALID_FRAME_INDEX', message: `Keyframe "${model.keyframeId}" has invalid frameIndex.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.frameMetadata !== 'object' || model.frameMetadata === null || Array.isArray(model.frameMetadata)) {
    warnings.push({ code: 'INVALID_FRAME_METADATA', message: `Keyframe "${model.keyframeId}" has invalid frameMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.interpolationMetadata !== 'object' || model.interpolationMetadata === null || Array.isArray(model.interpolationMetadata)) {
    warnings.push({ code: 'INVALID_INTERPOLATION_METADATA', message: `Keyframe "${model.keyframeId}" has invalid interpolationMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureAnimationHints !== 'object' || model.futureAnimationHints === null || Array.isArray(model.futureAnimationHints)) {
    warnings.push({ code: 'INVALID_FUTURE_ANIMATION_HINTS', message: `Keyframe "${model.keyframeId}" has invalid futureAnimationHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validatePlaybackGroupModel(
  model: PlaybackGroupModel,
  warnPrefix = '[AnimationPlayback]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_PLAYBACK_GROUP', message: 'Playback group model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.groupId) {
    warnings.push({ code: 'INVALID_GROUP_ID', message: 'Playback group ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.groupName) {
    warnings.push({ code: 'INVALID_GROUP_NAME', message: `Playback group "${model.groupId}" has empty groupName.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.groupState) {
    warnings.push({ code: 'INVALID_GROUP_STATE', message: `Playback group "${model.groupId}" has empty groupState.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.memberAnimations)) {
    warnings.push({ code: 'INVALID_MEMBER_ANIMATIONS', message: `Playback group "${model.groupId}" has invalid memberAnimations.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.groupMetadata !== 'object' || model.groupMetadata === null || Array.isArray(model.groupMetadata)) {
    warnings.push({ code: 'INVALID_GROUP_METADATA', message: `Playback group "${model.groupId}" has invalid groupMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureRendererHints !== 'object' || model.futureRendererHints === null || Array.isArray(model.futureRendererHints)) {
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `Playback group "${model.groupId}" has invalid futureRendererHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateDuplicateAnimationPlaybackIds(
  models: AnimationPlaybackModel[],
  warnPrefix = '[AnimationPlayback]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.playbackId)) {
      warnings.push({ code: 'DUPLICATE_PLAYBACK_ID', message: `Duplicate animation playback ID "${model.playbackId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.playbackId);
  }
  return warnings;
}

export function validateDuplicateTimelineIds(
  models: TimelineModel[],
  warnPrefix = '[AnimationPlayback]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.timelineId)) {
      warnings.push({ code: 'DUPLICATE_TIMELINE_ID', message: `Duplicate timeline ID "${model.timelineId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.timelineId);
  }
  return warnings;
}

export function validateDuplicateKeyframeIds(
  models: KeyframeModel[],
  warnPrefix = '[AnimationPlayback]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.keyframeId)) {
      warnings.push({ code: 'DUPLICATE_KEYFRAME_ID', message: `Duplicate keyframe ID "${model.keyframeId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.keyframeId);
  }
  return warnings;
}

export function validateDuplicatePlaybackGroupIds(
  models: PlaybackGroupModel[],
  warnPrefix = '[AnimationPlayback]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.groupId)) {
      warnings.push({ code: 'DUPLICATE_GROUP_ID', message: `Duplicate playback group ID "${model.groupId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.groupId);
  }
  return warnings;
}

export class AnimationPlaybackSynchronizer {
  private readonly playbackRegistry = new RenderRegistry<AnimationPlaybackModel>();
  private readonly timelineRegistry = new RenderRegistry<TimelineModel>();
  private readonly keyframeRegistry = new RenderRegistry<KeyframeModel>();
  private readonly playbackGroupRegistry = new RenderRegistry<PlaybackGroupModel>();

  private readonly warnPrefix = '[AnimationPlaybackSynchronizer]';

  public get animationPlaybacks(): RenderRegistry<AnimationPlaybackModel> {
    return this.playbackRegistry;
  }

  public get timelines(): RenderRegistry<TimelineModel> {
    return this.timelineRegistry;
  }

  public get keyframes(): RenderRegistry<KeyframeModel> {
    return this.keyframeRegistry;
  }

  public get playbackGroups(): RenderRegistry<PlaybackGroupModel> {
    return this.playbackGroupRegistry;
  }

  public buildSnapshot(
    playbackModels: AnimationPlaybackModel[] = [],
    timelineModels: TimelineModel[] = [],
    keyframeModels: KeyframeModel[] = [],
    playbackGroupModels: PlaybackGroupModel[] = [],
  ): AnimationPlaybackSnapshot {
    validateDuplicateAnimationPlaybackIds(playbackModels, this.warnPrefix);
    validateDuplicateTimelineIds(timelineModels, this.warnPrefix);
    validateDuplicateKeyframeIds(keyframeModels, this.warnPrefix);
    validateDuplicatePlaybackGroupIds(playbackGroupModels, this.warnPrefix);

    for (const m of playbackModels) {
      validateAnimationPlaybackModel(m, this.warnPrefix);
      this.playbackRegistry.register(m.playbackId, m, this.warnPrefix);
    }
    for (const m of timelineModels) {
      validateTimelineModel(m, this.warnPrefix);
      this.timelineRegistry.register(m.timelineId, m, this.warnPrefix);
    }
    for (const m of keyframeModels) {
      validateKeyframeModel(m, this.warnPrefix);
      this.keyframeRegistry.register(m.keyframeId, m, this.warnPrefix);
    }
    for (const m of playbackGroupModels) {
      validatePlaybackGroupModel(m, this.warnPrefix);
      this.playbackGroupRegistry.register(m.groupId, m, this.warnPrefix);
    }

    return {
      animationPlaybacks: safeDeepCopy(playbackModels),
      timelines: safeDeepCopy(timelineModels),
      keyframes: safeDeepCopy(keyframeModels),
      playbackGroups: safeDeepCopy(playbackGroupModels),
    };
  }

  public clear(): void {
    this.playbackRegistry.clear();
    this.timelineRegistry.clear();
    this.keyframeRegistry.clear();
    this.playbackGroupRegistry.clear();
  }

  public clone(): AnimationPlaybackSynchronizer {
    const cloned = new AnimationPlaybackSynchronizer();
    cloned.playbackRegistry.fromJSON(this.playbackRegistry.getAll(), p => p.playbackId, this.warnPrefix);
    cloned.timelineRegistry.fromJSON(this.timelineRegistry.getAll(), t => t.timelineId, this.warnPrefix);
    cloned.keyframeRegistry.fromJSON(this.keyframeRegistry.getAll(), k => k.keyframeId, this.warnPrefix);
    cloned.playbackGroupRegistry.fromJSON(this.playbackGroupRegistry.getAll(), g => g.groupId, this.warnPrefix);
    return cloned;
  }

  public toJSON(): {
    animationPlaybacks: AnimationPlaybackModel[];
    timelines: TimelineModel[];
    keyframes: KeyframeModel[];
    playbackGroups: PlaybackGroupModel[];
  } {
    return {
      animationPlaybacks: this.playbackRegistry.getAll(),
      timelines: this.timelineRegistry.getAll(),
      keyframes: this.keyframeRegistry.getAll(),
      playbackGroups: this.playbackGroupRegistry.getAll(),
    };
  }

  public fromJSON(data: {
    animationPlaybacks?: AnimationPlaybackModel[];
    timelines?: TimelineModel[];
    keyframes?: KeyframeModel[];
    playbackGroups?: PlaybackGroupModel[];
  }): void {
    this.clear();
    if (Array.isArray(data.animationPlaybacks)) {
      for (const m of data.animationPlaybacks) {
        this.playbackRegistry.register(m.playbackId, m, this.warnPrefix);
      }
    }
    if (Array.isArray(data.timelines)) {
      for (const m of data.timelines) {
        this.timelineRegistry.register(m.timelineId, m, this.warnPrefix);
      }
    }
    if (Array.isArray(data.keyframes)) {
      for (const m of data.keyframes) {
        this.keyframeRegistry.register(m.keyframeId, m, this.warnPrefix);
      }
    }
    if (Array.isArray(data.playbackGroups)) {
      for (const m of data.playbackGroups) {
        this.playbackGroupRegistry.register(m.groupId, m, this.warnPrefix);
      }
    }
  }

  public sync(data: {
    animationPlaybacks?: AnimationPlaybackModel[];
    timelines?: TimelineModel[];
    keyframes?: KeyframeModel[];
    playbackGroups?: PlaybackGroupModel[];
  }): void {
    this.fromJSON(data);
  }
}
