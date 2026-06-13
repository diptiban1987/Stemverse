import {
  SceneAssemblyModel,
  VisualAssemblyModel,
  BoardAssemblyModel,
  ComponentAssemblyModel,
  WireAssemblyModel,
  SignalAssemblyModel,
  AssemblySnapshot,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

// ─── VALIDATION ENUMS ─────────────────────────────────────────────────────────

const VALID_ASSEMBLY_STATES = [
  'ACTIVE',
  'INACTIVE',
  'BUILDING',
  'DISPOSED',
  'PENDING',
];

// ─── FACTORY FUNCTIONS ────────────────────────────────────────────────────────

export function createDefaultSceneAssemblyModel(
  assemblyId = 'default_scene_assembly',
  overrides: Partial<SceneAssemblyModel> = {},
): SceneAssemblyModel {
  return {
    assemblyId,
    sceneTreeId: overrides.sceneTreeId || 'default_scene_tree',
    assemblyState: overrides.assemblyState || 'ACTIVE',
    assemblyOrder: overrides.assemblyOrder !== undefined ? overrides.assemblyOrder : 0,
    assemblyMetadata: overrides.assemblyMetadata || {},
    futureRendererHints: overrides.futureRendererHints || {},
    ...overrides,
  };
}

export function createDefaultVisualAssemblyModel(
  visualAssemblyId = 'default_visual_assembly',
  overrides: Partial<VisualAssemblyModel> = {},
): VisualAssemblyModel {
  return {
    visualAssemblyId,
    assemblyId: overrides.assemblyId || 'default_scene_assembly',
    visualNodeIds: overrides.visualNodeIds || [],
    visualMetadata: overrides.visualMetadata || {},
    futureRendererHints: overrides.futureRendererHints || {},
    ...overrides,
  };
}

export function createDefaultBoardAssemblyModel(
  boardAssemblyId = 'default_board_assembly',
  overrides: Partial<BoardAssemblyModel> = {},
): BoardAssemblyModel {
  return {
    boardAssemblyId,
    boardId: overrides.boardId || 'default_board',
    componentIds: overrides.componentIds || [],
    wireIds: overrides.wireIds || [],
    signalIds: overrides.signalIds || [],
    assemblyMetadata: overrides.assemblyMetadata || {},
    ...overrides,
  };
}

export function createDefaultComponentAssemblyModel(
  componentAssemblyId = 'default_component_assembly',
  overrides: Partial<ComponentAssemblyModel> = {},
): ComponentAssemblyModel {
  return {
    componentAssemblyId,
    componentId: overrides.componentId || 'default_component',
    visualNodeId: overrides.visualNodeId || 'default_visual_node',
    themeId: overrides.themeId || 'default_theme',
    animationIds: overrides.animationIds || [],
    assemblyMetadata: overrides.assemblyMetadata || {},
    ...overrides,
  };
}

export function createDefaultWireAssemblyModel(
  wireAssemblyId = 'default_wire_assembly',
  overrides: Partial<WireAssemblyModel> = {},
): WireAssemblyModel {
  return {
    wireAssemblyId,
    wireId: overrides.wireId || 'default_wire',
    pathId: overrides.pathId || 'default_path',
    signalIds: overrides.signalIds || [],
    assemblyMetadata: overrides.assemblyMetadata || {},
    ...overrides,
  };
}

export function createDefaultSignalAssemblyModel(
  signalAssemblyId = 'default_signal_assembly',
  overrides: Partial<SignalAssemblyModel> = {},
): SignalAssemblyModel {
  return {
    signalAssemblyId,
    signalId: overrides.signalId || 'default_signal',
    effectIds: overrides.effectIds || [],
    animationIds: overrides.animationIds || [],
    assemblyMetadata: overrides.assemblyMetadata || {},
    ...overrides,
  };
}

// ─── MODEL VALIDATORS ─────────────────────────────────────────────────────────

export function validateSceneAssemblyModel(
  model: SceneAssemblyModel,
  warnPrefix = '[SceneAssembly]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_SCENE_ASSEMBLY', message: 'Scene assembly model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.assemblyId) {
    warnings.push({ code: 'INVALID_ASSEMBLY_ID', message: 'Scene assembly ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.sceneTreeId) {
    warnings.push({ code: 'INVALID_SCENE_TREE_ID', message: `Scene assembly "${model.assemblyId}" has empty sceneTreeId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_ASSEMBLY_STATES.includes(model.assemblyState)) {
    warnings.push({ code: 'INVALID_ASSEMBLY_STATE', message: `Scene assembly "${model.assemblyId}" has invalid assemblyState "${model.assemblyState}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.assemblyOrder !== 'number') {
    warnings.push({ code: 'INVALID_ASSEMBLY_ORDER', message: `Scene assembly "${model.assemblyId}" has invalid assemblyOrder.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.assemblyMetadata !== 'object' || model.assemblyMetadata === null || Array.isArray(model.assemblyMetadata)) {
    warnings.push({ code: 'INVALID_ASSEMBLY_METADATA', message: `Scene assembly "${model.assemblyId}" has invalid assemblyMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureRendererHints !== 'object' || model.futureRendererHints === null || Array.isArray(model.futureRendererHints)) {
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `Scene assembly "${model.assemblyId}" has invalid futureRendererHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateVisualAssemblyModel(
  model: VisualAssemblyModel,
  warnPrefix = '[SceneAssembly]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_VISUAL_ASSEMBLY', message: 'Visual assembly model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.visualAssemblyId) {
    warnings.push({ code: 'INVALID_VISUAL_ASSEMBLY_ID', message: 'Visual assembly ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.assemblyId) {
    warnings.push({ code: 'INVALID_ASSEMBLY_ID', message: `Visual assembly "${model.visualAssemblyId}" has empty assemblyId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.visualNodeIds)) {
    warnings.push({ code: 'INVALID_VISUAL_NODE_IDS', message: `Visual assembly "${model.visualAssemblyId}" has invalid visualNodeIds (must be an array).` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.visualMetadata !== 'object' || model.visualMetadata === null || Array.isArray(model.visualMetadata)) {
    warnings.push({ code: 'INVALID_VISUAL_METADATA', message: `Visual assembly "${model.visualAssemblyId}" has invalid visualMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureRendererHints !== 'object' || model.futureRendererHints === null || Array.isArray(model.futureRendererHints)) {
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `Visual assembly "${model.visualAssemblyId}" has invalid futureRendererHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateBoardAssemblyModel(
  model: BoardAssemblyModel,
  warnPrefix = '[SceneAssembly]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_BOARD_ASSEMBLY', message: 'Board assembly model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.boardAssemblyId) {
    warnings.push({ code: 'INVALID_BOARD_ASSEMBLY_ID', message: 'Board assembly ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.boardId) {
    warnings.push({ code: 'INVALID_BOARD_ID', message: `Board assembly "${model.boardAssemblyId}" has empty boardId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.componentIds)) {
    warnings.push({ code: 'INVALID_COMPONENT_IDS', message: `Board assembly "${model.boardAssemblyId}" has invalid componentIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.wireIds)) {
    warnings.push({ code: 'INVALID_WIRE_IDS', message: `Board assembly "${model.boardAssemblyId}" has invalid wireIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.signalIds)) {
    warnings.push({ code: 'INVALID_SIGNAL_IDS', message: `Board assembly "${model.boardAssemblyId}" has invalid signalIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.assemblyMetadata !== 'object' || model.assemblyMetadata === null || Array.isArray(model.assemblyMetadata)) {
    warnings.push({ code: 'INVALID_ASSEMBLY_METADATA', message: `Board assembly "${model.boardAssemblyId}" has invalid assemblyMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateComponentAssemblyModel(
  model: ComponentAssemblyModel,
  warnPrefix = '[SceneAssembly]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_COMPONENT_ASSEMBLY', message: 'Component assembly model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.componentAssemblyId) {
    warnings.push({ code: 'INVALID_COMPONENT_ASSEMBLY_ID', message: 'Component assembly ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.componentId) {
    warnings.push({ code: 'INVALID_COMPONENT_ID', message: `Component assembly "${model.componentAssemblyId}" has empty componentId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.visualNodeId) {
    warnings.push({ code: 'INVALID_VISUAL_NODE_ID', message: `Component assembly "${model.componentAssemblyId}" has empty visualNodeId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.themeId) {
    warnings.push({ code: 'INVALID_THEME_ID', message: `Component assembly "${model.componentAssemblyId}" has empty themeId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.animationIds)) {
    warnings.push({ code: 'INVALID_ANIMATION_IDS', message: `Component assembly "${model.componentAssemblyId}" has invalid animationIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.assemblyMetadata !== 'object' || model.assemblyMetadata === null || Array.isArray(model.assemblyMetadata)) {
    warnings.push({ code: 'INVALID_ASSEMBLY_METADATA', message: `Component assembly "${model.componentAssemblyId}" has invalid assemblyMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateWireAssemblyModel(
  model: WireAssemblyModel,
  warnPrefix = '[SceneAssembly]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_WIRE_ASSEMBLY', message: 'Wire assembly model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.wireAssemblyId) {
    warnings.push({ code: 'INVALID_WIRE_ASSEMBLY_ID', message: 'Wire assembly ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.wireId) {
    warnings.push({ code: 'INVALID_WIRE_ID', message: `Wire assembly "${model.wireAssemblyId}" has empty wireId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.pathId) {
    warnings.push({ code: 'INVALID_PATH_ID', message: `Wire assembly "${model.wireAssemblyId}" has empty pathId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.signalIds)) {
    warnings.push({ code: 'INVALID_SIGNAL_IDS', message: `Wire assembly "${model.wireAssemblyId}" has invalid signalIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.assemblyMetadata !== 'object' || model.assemblyMetadata === null || Array.isArray(model.assemblyMetadata)) {
    warnings.push({ code: 'INVALID_ASSEMBLY_METADATA', message: `Wire assembly "${model.wireAssemblyId}" has invalid assemblyMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateSignalAssemblyModel(
  model: SignalAssemblyModel,
  warnPrefix = '[SceneAssembly]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_SIGNAL_ASSEMBLY', message: 'Signal assembly model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.signalAssemblyId) {
    warnings.push({ code: 'INVALID_SIGNAL_ASSEMBLY_ID', message: 'Signal assembly ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.signalId) {
    warnings.push({ code: 'INVALID_SIGNAL_ID', message: `Signal assembly "${model.signalAssemblyId}" has empty signalId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.effectIds)) {
    warnings.push({ code: 'INVALID_EFFECT_IDS', message: `Signal assembly "${model.signalAssemblyId}" has invalid effectIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.animationIds)) {
    warnings.push({ code: 'INVALID_ANIMATION_IDS', message: `Signal assembly "${model.signalAssemblyId}" has invalid animationIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.assemblyMetadata !== 'object' || model.assemblyMetadata === null || Array.isArray(model.assemblyMetadata)) {
    warnings.push({ code: 'INVALID_ASSEMBLY_METADATA', message: `Signal assembly "${model.signalAssemblyId}" has invalid assemblyMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ─── DUPLICATE VALIDATORS ─────────────────────────────────────────────────────

export function validateDuplicateSceneAssemblyIds(
  models: SceneAssemblyModel[],
  warnPrefix = '[SceneAssembly]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.assemblyId)) {
      warnings.push({ code: 'DUPLICATE_ASSEMBLY_ID', message: `Duplicate scene assembly ID "${model.assemblyId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.assemblyId);
  }
  return warnings;
}

export function validateDuplicateVisualAssemblyIds(
  models: VisualAssemblyModel[],
  warnPrefix = '[SceneAssembly]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.visualAssemblyId)) {
      warnings.push({ code: 'DUPLICATE_VISUAL_ASSEMBLY_ID', message: `Duplicate visual assembly ID "${model.visualAssemblyId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.visualAssemblyId);
  }
  return warnings;
}

export function validateDuplicateBoardAssemblyIds(
  models: BoardAssemblyModel[],
  warnPrefix = '[SceneAssembly]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.boardAssemblyId)) {
      warnings.push({ code: 'DUPLICATE_BOARD_ASSEMBLY_ID', message: `Duplicate board assembly ID "${model.boardAssemblyId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.boardAssemblyId);
  }
  return warnings;
}

export function validateDuplicateComponentAssemblyIds(
  models: ComponentAssemblyModel[],
  warnPrefix = '[SceneAssembly]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.componentAssemblyId)) {
      warnings.push({ code: 'DUPLICATE_COMPONENT_ASSEMBLY_ID', message: `Duplicate component assembly ID "${model.componentAssemblyId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.componentAssemblyId);
  }
  return warnings;
}

export function validateDuplicateWireAssemblyIds(
  models: WireAssemblyModel[],
  warnPrefix = '[SceneAssembly]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.wireAssemblyId)) {
      warnings.push({ code: 'DUPLICATE_WIRE_ASSEMBLY_ID', message: `Duplicate wire assembly ID "${model.wireAssemblyId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.wireAssemblyId);
  }
  return warnings;
}

export function validateDuplicateSignalAssemblyIds(
  models: SignalAssemblyModel[],
  warnPrefix = '[SceneAssembly]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.signalAssemblyId)) {
      warnings.push({ code: 'DUPLICATE_SIGNAL_ASSEMBLY_ID', message: `Duplicate signal assembly ID "${model.signalAssemblyId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.signalAssemblyId);
  }
  return warnings;
}

// ─── SYNCHRONIZER CLASS ────────────────────────────────────────────────────────

export class SceneAssemblySynchronizer {
  private readonly sceneAssemblyRegistry = new RenderRegistry<SceneAssemblyModel>();
  private readonly visualAssemblyRegistry = new RenderRegistry<VisualAssemblyModel>();
  private readonly boardAssemblyRegistry = new RenderRegistry<BoardAssemblyModel>();
  private readonly componentAssemblyRegistry = new RenderRegistry<ComponentAssemblyModel>();
  private readonly wireAssemblyRegistry = new RenderRegistry<WireAssemblyModel>();
  private readonly signalAssemblyRegistry = new RenderRegistry<SignalAssemblyModel>();

  private readonly warnPrefix = '[SceneAssemblySynchronizer]';

  public get sceneAssemblies(): RenderRegistry<SceneAssemblyModel> {
    return this.sceneAssemblyRegistry;
  }

  public get visualAssemblies(): RenderRegistry<VisualAssemblyModel> {
    return this.visualAssemblyRegistry;
  }

  public get boardAssemblies(): RenderRegistry<BoardAssemblyModel> {
    return this.boardAssemblyRegistry;
  }

  public get componentAssemblies(): RenderRegistry<ComponentAssemblyModel> {
    return this.componentAssemblyRegistry;
  }

  public get wireAssemblies(): RenderRegistry<WireAssemblyModel> {
    return this.wireAssemblyRegistry;
  }

  public get signalAssemblies(): RenderRegistry<SignalAssemblyModel> {
    return this.signalAssemblyRegistry;
  }

  public buildSnapshot(
    sceneAssemblyModels: SceneAssemblyModel[] = [],
    visualAssemblyModels: VisualAssemblyModel[] = [],
    boardAssemblyModels: BoardAssemblyModel[] = [],
    componentAssemblyModels: ComponentAssemblyModel[] = [],
    wireAssemblyModels: WireAssemblyModel[] = [],
    signalAssemblyModels: SignalAssemblyModel[] = [],
  ): AssemblySnapshot {
    validateDuplicateSceneAssemblyIds(sceneAssemblyModels, this.warnPrefix);
    validateDuplicateVisualAssemblyIds(visualAssemblyModels, this.warnPrefix);
    validateDuplicateBoardAssemblyIds(boardAssemblyModels, this.warnPrefix);
    validateDuplicateComponentAssemblyIds(componentAssemblyModels, this.warnPrefix);
    validateDuplicateWireAssemblyIds(wireAssemblyModels, this.warnPrefix);
    validateDuplicateSignalAssemblyIds(signalAssemblyModels, this.warnPrefix);

    for (const m of sceneAssemblyModels) {
      validateSceneAssemblyModel(m, this.warnPrefix);
      this.sceneAssemblyRegistry.register(m.assemblyId, m, this.warnPrefix);
    }
    for (const m of visualAssemblyModels) {
      validateVisualAssemblyModel(m, this.warnPrefix);
      this.visualAssemblyRegistry.register(m.visualAssemblyId, m, this.warnPrefix);
    }
    for (const m of boardAssemblyModels) {
      validateBoardAssemblyModel(m, this.warnPrefix);
      this.boardAssemblyRegistry.register(m.boardAssemblyId, m, this.warnPrefix);
    }
    for (const m of componentAssemblyModels) {
      validateComponentAssemblyModel(m, this.warnPrefix);
      this.componentAssemblyRegistry.register(m.componentAssemblyId, m, this.warnPrefix);
    }
    for (const m of wireAssemblyModels) {
      validateWireAssemblyModel(m, this.warnPrefix);
      this.wireAssemblyRegistry.register(m.wireAssemblyId, m, this.warnPrefix);
    }
    for (const m of signalAssemblyModels) {
      validateSignalAssemblyModel(m, this.warnPrefix);
      this.signalAssemblyRegistry.register(m.signalAssemblyId, m, this.warnPrefix);
    }

    return {
      sceneAssemblies: safeDeepCopy(sceneAssemblyModels),
      visualAssemblies: safeDeepCopy(visualAssemblyModels),
      boardAssemblies: safeDeepCopy(boardAssemblyModels),
      componentAssemblies: safeDeepCopy(componentAssemblyModels),
      wireAssemblies: safeDeepCopy(wireAssemblyModels),
      signalAssemblies: safeDeepCopy(signalAssemblyModels),
    };
  }

  public clear(): void {
    this.sceneAssemblyRegistry.clear();
    this.visualAssemblyRegistry.clear();
    this.boardAssemblyRegistry.clear();
    this.componentAssemblyRegistry.clear();
    this.wireAssemblyRegistry.clear();
    this.signalAssemblyRegistry.clear();
  }

  public clone(): SceneAssemblySynchronizer {
    const cloned = new SceneAssemblySynchronizer();
    cloned.sceneAssemblyRegistry.fromJSON(
      this.sceneAssemblyRegistry.getAll(),
      n => n.assemblyId,
      this.warnPrefix,
    );
    cloned.visualAssemblyRegistry.fromJSON(
      this.visualAssemblyRegistry.getAll(),
      v => v.visualAssemblyId,
      this.warnPrefix,
    );
    cloned.boardAssemblyRegistry.fromJSON(
      this.boardAssemblyRegistry.getAll(),
      b => b.boardAssemblyId,
      this.warnPrefix,
    );
    cloned.componentAssemblyRegistry.fromJSON(
      this.componentAssemblyRegistry.getAll(),
      c => c.componentAssemblyId,
      this.warnPrefix,
    );
    cloned.wireAssemblyRegistry.fromJSON(
      this.wireAssemblyRegistry.getAll(),
      w => w.wireAssemblyId,
      this.warnPrefix,
    );
    cloned.signalAssemblyRegistry.fromJSON(
      this.signalAssemblyRegistry.getAll(),
      s => s.signalAssemblyId,
      this.warnPrefix,
    );
    return cloned;
  }

  public toJSON(): {
    sceneAssemblies: SceneAssemblyModel[];
    visualAssemblies: VisualAssemblyModel[];
    boardAssemblies: BoardAssemblyModel[];
    componentAssemblies: ComponentAssemblyModel[];
    wireAssemblies: WireAssemblyModel[];
    signalAssemblies: SignalAssemblyModel[];
  } {
    return {
      sceneAssemblies: this.sceneAssemblyRegistry.getAll(),
      visualAssemblies: this.visualAssemblyRegistry.getAll(),
      boardAssemblies: this.boardAssemblyRegistry.getAll(),
      componentAssemblies: this.componentAssemblyRegistry.getAll(),
      wireAssemblies: this.wireAssemblyRegistry.getAll(),
      signalAssemblies: this.signalAssemblyRegistry.getAll(),
    };
  }

  public fromJSON(data: {
    sceneAssemblies?: SceneAssemblyModel[];
    visualAssemblies?: VisualAssemblyModel[];
    boardAssemblies?: BoardAssemblyModel[];
    componentAssemblies?: ComponentAssemblyModel[];
    wireAssemblies?: WireAssemblyModel[];
    signalAssemblies?: SignalAssemblyModel[];
  }): void {
    this.clear();
    if (Array.isArray(data.sceneAssemblies)) {
      for (const m of data.sceneAssemblies) {
        this.sceneAssemblyRegistry.register(m.assemblyId, m, this.warnPrefix);
      }
    }
    if (Array.isArray(data.visualAssemblies)) {
      for (const m of data.visualAssemblies) {
        this.visualAssemblyRegistry.register(m.visualAssemblyId, m, this.warnPrefix);
      }
    }
    if (Array.isArray(data.boardAssemblies)) {
      for (const m of data.boardAssemblies) {
        this.boardAssemblyRegistry.register(m.boardAssemblyId, m, this.warnPrefix);
      }
    }
    if (Array.isArray(data.componentAssemblies)) {
      for (const m of data.componentAssemblies) {
        this.componentAssemblyRegistry.register(m.componentAssemblyId, m, this.warnPrefix);
      }
    }
    if (Array.isArray(data.wireAssemblies)) {
      for (const m of data.wireAssemblies) {
        this.wireAssemblyRegistry.register(m.wireAssemblyId, m, this.warnPrefix);
      }
    }
    if (Array.isArray(data.signalAssemblies)) {
      for (const m of data.signalAssemblies) {
        this.signalAssemblyRegistry.register(m.signalAssemblyId, m, this.warnPrefix);
      }
    }
  }

  public sync(data: {
    sceneAssemblies?: SceneAssemblyModel[];
    visualAssemblies?: VisualAssemblyModel[];
    boardAssemblies?: BoardAssemblyModel[];
    componentAssemblies?: ComponentAssemblyModel[];
    wireAssemblies?: WireAssemblyModel[];
    signalAssemblies?: SignalAssemblyModel[];
  }): void {
    this.fromJSON(data);
  }
}
