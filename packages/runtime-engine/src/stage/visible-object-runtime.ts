import {
  VisualObjectModel,
  BoardObjectModel,
  ComponentObjectModel,
  WireObjectModel,
  SignalObjectModel,
  ThemeObjectModel,
  AnimationObjectModel,
  VisibleObjectSnapshot,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

// ─── VALIDATION ENUMS ─────────────────────────────────────────────────────────

const VALID_OBJECT_STATES = [
  'ACTIVE',
  'INACTIVE',
  'MUTATED',
  'DISPOSED',
  'INITIAL',
];

// ─── FACTORY FUNCTIONS ────────────────────────────────────────────────────────

export function createDefaultVisualObjectModel(
  objectId = 'default_visual_object',
  overrides: Partial<VisualObjectModel> = {},
): VisualObjectModel {
  return {
    objectId,
    assemblyId: overrides.assemblyId || 'default_scene_assembly',
    objectType: overrides.objectType || 'SPRITE',
    objectState: overrides.objectState || 'ACTIVE',
    objectOrder: overrides.objectOrder !== undefined ? overrides.objectOrder : 0,
    objectMetadata: overrides.objectMetadata || {},
    futureRendererHints: overrides.futureRendererHints || {},
    ...overrides,
  };
}

export function createDefaultBoardObjectModel(
  boardObjectId = 'default_board_object',
  overrides: Partial<BoardObjectModel> = {},
): BoardObjectModel {
  return {
    boardObjectId,
    assemblyId: overrides.assemblyId || 'default_scene_assembly',
    boardId: overrides.boardId || 'default_board',
    componentObjectIds: overrides.componentObjectIds || [],
    wireObjectIds: overrides.wireObjectIds || [],
    signalObjectIds: overrides.signalObjectIds || [],
    objectMetadata: overrides.objectMetadata || {},
    ...overrides,
  };
}

export function createDefaultComponentObjectModel(
  componentObjectId = 'default_component_object',
  overrides: Partial<ComponentObjectModel> = {},
): ComponentObjectModel {
  return {
    componentObjectId,
    assemblyId: overrides.assemblyId || 'default_scene_assembly',
    componentId: overrides.componentId || 'default_component',
    visualObjectId: overrides.visualObjectId || 'default_visual_object',
    themeObjectId: overrides.themeObjectId || 'default_theme_object',
    animationObjectIds: overrides.animationObjectIds || [],
    objectMetadata: overrides.objectMetadata || {},
    ...overrides,
  };
}

export function createDefaultWireObjectModel(
  wireObjectId = 'default_wire_object',
  overrides: Partial<WireObjectModel> = {},
): WireObjectModel {
  return {
    wireObjectId,
    assemblyId: overrides.assemblyId || 'default_scene_assembly',
    wireId: overrides.wireId || 'default_wire',
    pathId: overrides.pathId || 'default_path',
    signalObjectIds: overrides.signalObjectIds || [],
    objectMetadata: overrides.objectMetadata || {},
    ...overrides,
  };
}

export function createDefaultSignalObjectModel(
  signalObjectId = 'default_signal_object',
  overrides: Partial<SignalObjectModel> = {},
): SignalObjectModel {
  return {
    signalObjectId,
    assemblyId: overrides.assemblyId || 'default_scene_assembly',
    signalId: overrides.signalId || 'default_signal',
    effectIds: overrides.effectIds || [],
    animationObjectIds: overrides.animationObjectIds || [],
    objectMetadata: overrides.objectMetadata || {},
    ...overrides,
  };
}

export function createDefaultThemeObjectModel(
  themeObjectId = 'default_theme_object',
  overrides: Partial<ThemeObjectModel> = {},
): ThemeObjectModel {
  return {
    themeObjectId,
    assemblyId: overrides.assemblyId || 'default_scene_assembly',
    themeId: overrides.themeId || 'default_theme',
    colorPaletteIds: overrides.colorPaletteIds || [],
    componentStyleIds: overrides.componentStyleIds || [],
    workspaceStyleIds: overrides.workspaceStyleIds || [],
    objectMetadata: overrides.objectMetadata || {},
    ...overrides,
  };
}

export function createDefaultAnimationObjectModel(
  animationObjectId = 'default_animation_object',
  overrides: Partial<AnimationObjectModel> = {},
): AnimationObjectModel {
  return {
    animationObjectId,
    assemblyId: overrides.assemblyId || 'default_scene_assembly',
    animationId: overrides.animationId || 'default_animation',
    timelineIds: overrides.timelineIds || [],
    playbackGroupIds: overrides.playbackGroupIds || [],
    objectMetadata: overrides.objectMetadata || {},
    ...overrides,
  };
}

// ─── MODEL VALIDATORS ─────────────────────────────────────────────────────────

export function validateVisualObjectModel(
  model: VisualObjectModel,
  warnPrefix = '[VisibleObject]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_VISUAL_OBJECT', message: 'Visual object model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.objectId) {
    warnings.push({ code: 'INVALID_OBJECT_ID', message: 'Visual object ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.assemblyId) {
    warnings.push({ code: 'INVALID_ASSEMBLY_ID', message: `Visual object "${model.objectId}" has empty assemblyId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_OBJECT_STATES.includes(model.objectState)) {
    warnings.push({ code: 'INVALID_OBJECT_STATE', message: `Visual object "${model.objectId}" has invalid objectState "${model.objectState}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.objectOrder !== 'number') {
    warnings.push({ code: 'INVALID_OBJECT_ORDER', message: `Visual object "${model.objectId}" has invalid objectOrder.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.objectMetadata !== 'object' || model.objectMetadata === null || Array.isArray(model.objectMetadata)) {
    warnings.push({ code: 'INVALID_OBJECT_METADATA', message: `Visual object "${model.objectId}" has invalid objectMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateBoardObjectModel(
  model: BoardObjectModel,
  warnPrefix = '[VisibleObject]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_BOARD_OBJECT', message: 'Board object model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.boardObjectId) {
    warnings.push({ code: 'INVALID_BOARD_OBJECT_ID', message: 'Board object ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.assemblyId) {
    warnings.push({ code: 'INVALID_ASSEMBLY_ID', message: `Board object "${model.boardObjectId}" has empty assemblyId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.boardId) {
    warnings.push({ code: 'INVALID_BOARD_ID', message: `Board object "${model.boardObjectId}" has empty boardId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.componentObjectIds)) {
    warnings.push({ code: 'INVALID_COMPONENT_OBJECT_IDS', message: `Board object "${model.boardObjectId}" has invalid componentObjectIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.wireObjectIds)) {
    warnings.push({ code: 'INVALID_WIRE_OBJECT_IDS', message: `Board object "${model.boardObjectId}" has invalid wireObjectIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.signalObjectIds)) {
    warnings.push({ code: 'INVALID_SIGNAL_OBJECT_IDS', message: `Board object "${model.boardObjectId}" has invalid signalObjectIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.objectMetadata !== 'object' || model.objectMetadata === null || Array.isArray(model.objectMetadata)) {
    warnings.push({ code: 'INVALID_OBJECT_METADATA', message: `Board object "${model.boardObjectId}" has invalid objectMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateComponentObjectModel(
  model: ComponentObjectModel,
  warnPrefix = '[VisibleObject]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_COMPONENT_OBJECT', message: 'Component object model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.componentObjectId) {
    warnings.push({ code: 'INVALID_COMPONENT_OBJECT_ID', message: 'Component object ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.assemblyId) {
    warnings.push({ code: 'INVALID_ASSEMBLY_ID', message: `Component object "${model.componentObjectId}" has empty assemblyId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.componentId) {
    warnings.push({ code: 'INVALID_COMPONENT_ID', message: `Component object "${model.componentObjectId}" has empty componentId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.visualObjectId) {
    warnings.push({ code: 'INVALID_VISUAL_OBJECT_ID', message: `Component object "${model.componentObjectId}" has empty visualObjectId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.themeObjectId) {
    warnings.push({ code: 'INVALID_THEME_OBJECT_ID', message: `Component object "${model.componentObjectId}" has empty themeObjectId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.animationObjectIds)) {
    warnings.push({ code: 'INVALID_ANIMATION_OBJECT_IDS', message: `Component object "${model.componentObjectId}" has invalid animationObjectIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.objectMetadata !== 'object' || model.objectMetadata === null || Array.isArray(model.objectMetadata)) {
    warnings.push({ code: 'INVALID_OBJECT_METADATA', message: `Component object "${model.componentObjectId}" has invalid objectMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateWireObjectModel(
  model: WireObjectModel,
  warnPrefix = '[VisibleObject]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_WIRE_OBJECT', message: 'Wire object model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.wireObjectId) {
    warnings.push({ code: 'INVALID_WIRE_OBJECT_ID', message: 'Wire object ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.assemblyId) {
    warnings.push({ code: 'INVALID_ASSEMBLY_ID', message: `Wire object "${model.wireObjectId}" has empty assemblyId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.wireId) {
    warnings.push({ code: 'INVALID_WIRE_ID', message: `Wire object "${model.wireObjectId}" has empty wireId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.pathId) {
    warnings.push({ code: 'INVALID_PATH_ID', message: `Wire object "${model.wireObjectId}" has empty pathId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.signalObjectIds)) {
    warnings.push({ code: 'INVALID_SIGNAL_OBJECT_IDS', message: `Wire object "${model.wireObjectId}" has invalid signalObjectIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.objectMetadata !== 'object' || model.objectMetadata === null || Array.isArray(model.objectMetadata)) {
    warnings.push({ code: 'INVALID_OBJECT_METADATA', message: `Wire object "${model.wireObjectId}" has invalid objectMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateSignalObjectModel(
  model: SignalObjectModel,
  warnPrefix = '[VisibleObject]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_SIGNAL_OBJECT', message: 'Signal object model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.signalObjectId) {
    warnings.push({ code: 'INVALID_SIGNAL_OBJECT_ID', message: 'Signal object ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.assemblyId) {
    warnings.push({ code: 'INVALID_ASSEMBLY_ID', message: `Signal object "${model.signalObjectId}" has empty assemblyId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.signalId) {
    warnings.push({ code: 'INVALID_SIGNAL_ID', message: `Signal object "${model.signalObjectId}" has empty signalId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.effectIds)) {
    warnings.push({ code: 'INVALID_EFFECT_IDS', message: `Signal object "${model.signalObjectId}" has invalid effectIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.animationObjectIds)) {
    warnings.push({ code: 'INVALID_ANIMATION_OBJECT_IDS', message: `Signal object "${model.signalObjectId}" has invalid animationObjectIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.objectMetadata !== 'object' || model.objectMetadata === null || Array.isArray(model.objectMetadata)) {
    warnings.push({ code: 'INVALID_OBJECT_METADATA', message: `Signal object "${model.signalObjectId}" has invalid objectMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateThemeObjectModel(
  model: ThemeObjectModel,
  warnPrefix = '[VisibleObject]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_THEME_OBJECT', message: 'Theme object model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.themeObjectId) {
    warnings.push({ code: 'INVALID_THEME_OBJECT_ID', message: 'Theme object ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.assemblyId) {
    warnings.push({ code: 'INVALID_ASSEMBLY_ID', message: `Theme object "${model.themeObjectId}" has empty assemblyId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.themeId) {
    warnings.push({ code: 'INVALID_THEME_ID', message: `Theme object "${model.themeObjectId}" has empty themeId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.colorPaletteIds)) {
    warnings.push({ code: 'INVALID_COLOR_PALETTE_IDS', message: `Theme object "${model.themeObjectId}" has invalid colorPaletteIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.componentStyleIds)) {
    warnings.push({ code: 'INVALID_COMPONENT_STYLE_IDS', message: `Theme object "${model.themeObjectId}" has invalid componentStyleIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.workspaceStyleIds)) {
    warnings.push({ code: 'INVALID_WORKSPACE_STYLE_IDS', message: `Theme object "${model.themeObjectId}" has invalid workspaceStyleIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.objectMetadata !== 'object' || model.objectMetadata === null || Array.isArray(model.objectMetadata)) {
    warnings.push({ code: 'INVALID_OBJECT_METADATA', message: `Theme object "${model.themeObjectId}" has invalid objectMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateAnimationObjectModel(
  model: AnimationObjectModel,
  warnPrefix = '[VisibleObject]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_ANIMATION_OBJECT', message: 'Animation object model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.animationObjectId) {
    warnings.push({ code: 'INVALID_ANIMATION_OBJECT_ID', message: 'Animation object ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.assemblyId) {
    warnings.push({ code: 'INVALID_ASSEMBLY_ID', message: `Animation object "${model.animationObjectId}" has empty assemblyId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.animationId) {
    warnings.push({ code: 'INVALID_ANIMATION_ID', message: `Animation object "${model.animationObjectId}" has empty animationId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.timelineIds)) {
    warnings.push({ code: 'INVALID_TIMELINE_IDS', message: `Animation object "${model.animationObjectId}" has invalid timelineIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.playbackGroupIds)) {
    warnings.push({ code: 'INVALID_PLAYBACK_GROUP_IDS', message: `Animation object "${model.animationObjectId}" has invalid playbackGroupIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.objectMetadata !== 'object' || model.objectMetadata === null || Array.isArray(model.objectMetadata)) {
    warnings.push({ code: 'INVALID_OBJECT_METADATA', message: `Animation object "${model.animationObjectId}" has invalid objectMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ─── DUPLICATE VALIDATORS ─────────────────────────────────────────────────────

export function validateDuplicateVisualObjectIds(
  models: VisualObjectModel[],
  warnPrefix = '[VisibleObject]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.objectId)) {
      warnings.push({ code: 'DUPLICATE_OBJECT_ID', message: `Duplicate visual object ID "${model.objectId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.objectId);
  }
  return warnings;
}

export function validateDuplicateBoardObjectIds(
  models: BoardObjectModel[],
  warnPrefix = '[VisibleObject]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.boardObjectId)) {
      warnings.push({ code: 'DUPLICATE_BOARD_OBJECT_ID', message: `Duplicate board object ID "${model.boardObjectId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.boardObjectId);
  }
  return warnings;
}

export function validateDuplicateComponentObjectIds(
  models: ComponentObjectModel[],
  warnPrefix = '[VisibleObject]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.componentObjectId)) {
      warnings.push({ code: 'DUPLICATE_COMPONENT_OBJECT_ID', message: `Duplicate component object ID "${model.componentObjectId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.componentObjectId);
  }
  return warnings;
}

export function validateDuplicateWireObjectIds(
  models: WireObjectModel[],
  warnPrefix = '[VisibleObject]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.wireObjectId)) {
      warnings.push({ code: 'DUPLICATE_WIRE_OBJECT_ID', message: `Duplicate wire object ID "${model.wireObjectId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.wireObjectId);
  }
  return warnings;
}

export function validateDuplicateSignalObjectIds(
  models: SignalObjectModel[],
  warnPrefix = '[VisibleObject]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.signalObjectId)) {
      warnings.push({ code: 'DUPLICATE_SIGNAL_OBJECT_ID', message: `Duplicate signal object ID "${model.signalObjectId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.signalObjectId);
  }
  return warnings;
}

export function validateDuplicateThemeObjectIds(
  models: ThemeObjectModel[],
  warnPrefix = '[VisibleObject]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.themeObjectId)) {
      warnings.push({ code: 'DUPLICATE_THEME_OBJECT_ID', message: `Duplicate theme object ID "${model.themeObjectId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.themeObjectId);
  }
  return warnings;
}

export function validateDuplicateAnimationObjectIds(
  models: AnimationObjectModel[],
  warnPrefix = '[VisibleObject]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.animationObjectId)) {
      warnings.push({ code: 'DUPLICATE_ANIMATION_OBJECT_ID', message: `Duplicate animation object ID "${model.animationObjectId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.animationObjectId);
  }
  return warnings;
}

// ─── SYNCHRONIZER CLASS ────────────────────────────────────────────────────────

export class VisibleObjectSynchronizer {
  private readonly visualObjectRegistry = new RenderRegistry<VisualObjectModel>();
  private readonly boardObjectRegistry = new RenderRegistry<BoardObjectModel>();
  private readonly componentObjectRegistry = new RenderRegistry<ComponentObjectModel>();
  private readonly wireObjectRegistry = new RenderRegistry<WireObjectModel>();
  private readonly signalObjectRegistry = new RenderRegistry<SignalObjectModel>();
  private readonly themeObjectRegistry = new RenderRegistry<ThemeObjectModel>();
  private readonly animationObjectRegistry = new RenderRegistry<AnimationObjectModel>();

  private readonly warnPrefix = '[VisibleObjectSynchronizer]';

  public get visualObjects(): RenderRegistry<VisualObjectModel> {
    return this.visualObjectRegistry;
  }

  public get boardObjects(): RenderRegistry<BoardObjectModel> {
    return this.boardObjectRegistry;
  }

  public get componentObjects(): RenderRegistry<ComponentObjectModel> {
    return this.componentObjectRegistry;
  }

  public get wireObjects(): RenderRegistry<WireObjectModel> {
    return this.wireObjectRegistry;
  }

  public get signalObjects(): RenderRegistry<SignalObjectModel> {
    return this.signalObjectRegistry;
  }

  public get themeObjects(): RenderRegistry<ThemeObjectModel> {
    return this.themeObjectRegistry;
  }

  public get animationObjects(): RenderRegistry<AnimationObjectModel> {
    return this.animationObjectRegistry;
  }

  public buildSnapshot(
    visualObjects: VisualObjectModel[] = [],
    boardObjects: BoardObjectModel[] = [],
    componentObjects: ComponentObjectModel[] = [],
    wireObjects: WireObjectModel[] = [],
    signalObjects: SignalObjectModel[] = [],
    themeObjects: ThemeObjectModel[] = [],
    animationObjects: AnimationObjectModel[] = [],
  ): VisibleObjectSnapshot {
    validateDuplicateVisualObjectIds(visualObjects, this.warnPrefix);
    validateDuplicateBoardObjectIds(boardObjects, this.warnPrefix);
    validateDuplicateComponentObjectIds(componentObjects, this.warnPrefix);
    validateDuplicateWireObjectIds(wireObjects, this.warnPrefix);
    validateDuplicateSignalObjectIds(signalObjects, this.warnPrefix);
    validateDuplicateThemeObjectIds(themeObjects, this.warnPrefix);
    validateDuplicateAnimationObjectIds(animationObjects, this.warnPrefix);

    for (const m of visualObjects) {
      validateVisualObjectModel(m, this.warnPrefix);
      this.visualObjectRegistry.register(m.objectId, m, this.warnPrefix);
    }
    for (const m of boardObjects) {
      validateBoardObjectModel(m, this.warnPrefix);
      this.boardObjectRegistry.register(m.boardObjectId, m, this.warnPrefix);
    }
    for (const m of componentObjects) {
      validateComponentObjectModel(m, this.warnPrefix);
      this.componentObjectRegistry.register(m.componentObjectId, m, this.warnPrefix);
    }
    for (const m of wireObjects) {
      validateWireObjectModel(m, this.warnPrefix);
      this.wireObjectRegistry.register(m.wireObjectId, m, this.warnPrefix);
    }
    for (const m of signalObjects) {
      validateSignalObjectModel(m, this.warnPrefix);
      this.signalObjectRegistry.register(m.signalObjectId, m, this.warnPrefix);
    }
    for (const m of themeObjects) {
      validateThemeObjectModel(m, this.warnPrefix);
      this.themeObjectRegistry.register(m.themeObjectId, m, this.warnPrefix);
    }
    for (const m of animationObjects) {
      validateAnimationObjectModel(m, this.warnPrefix);
      this.animationObjectRegistry.register(m.animationObjectId, m, this.warnPrefix);
    }

    return this.clone();
  }

  public clear(): void {
    this.visualObjectRegistry.clear();
    this.boardObjectRegistry.clear();
    this.componentObjectRegistry.clear();
    this.wireObjectRegistry.clear();
    this.signalObjectRegistry.clear();
    this.themeObjectRegistry.clear();
    this.animationObjectRegistry.clear();
  }

  public clone(): VisibleObjectSnapshot {
    return {
      visualObjects: safeDeepCopy(this.visualObjectRegistry.getAll()),
      boardObjects: safeDeepCopy(this.boardObjectRegistry.getAll()),
      componentObjects: safeDeepCopy(this.componentObjectRegistry.getAll()),
      wireObjects: safeDeepCopy(this.wireObjectRegistry.getAll()),
      signalObjects: safeDeepCopy(this.signalObjectRegistry.getAll()),
      themeObjects: safeDeepCopy(this.themeObjectRegistry.getAll()),
      animationObjects: safeDeepCopy(this.animationObjectRegistry.getAll()),
    };
  }

  public toJSON(): string {
    return JSON.stringify(this.clone());
  }

  public fromJSON(json: string): void {
    try {
      const data = JSON.parse(json) as Partial<VisibleObjectSnapshot>;
      this.clear();
      if (data) {
        this.buildSnapshot(
          data.visualObjects || [],
          data.boardObjects || [],
          data.componentObjects || [],
          data.wireObjects || [],
          data.signalObjects || [],
          data.themeObjects || [],
          data.animationObjects || [],
        );
      }
    } catch (err: any) {
      console.warn(`${this.warnPrefix} failed to parse JSON snapshot: ${err.message}`);
    }
  }

  public sync(snapshot: VisibleObjectSnapshot): void {
    this.clear();
    if (snapshot) {
      this.buildSnapshot(
        snapshot.visualObjects || [],
        snapshot.boardObjects || [],
        snapshot.componentObjects || [],
        snapshot.wireObjects || [],
        snapshot.signalObjects || [],
        snapshot.themeObjects || [],
        snapshot.animationObjects || [],
      );
    }
  }
}
