import {
  VisualNodeModel,
  SceneTreeModel,
  LayerCompositionModel,
  VisualCompositionModel,
  VisibleRenderingSnapshot,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

// ─── VALIDATION ENUMS ─────────────────────────────────────────────────────────

const VALID_NODE_TYPES = [
  'ROOT',
  'COMPONENT',
  'BOARD',
  'WIRE',
  'SIGNAL',
  'ANIMATION',
  'LAYER',
  'GROUP',
  'OVERLAY',
  'BACKGROUND',
];

const VALID_NODE_STATES = [
  'ACTIVE',
  'INACTIVE',
  'HIDDEN',
  'PENDING',
  'DISPOSED',
];

const VALID_VISIBILITY_STATES = [
  'VISIBLE',
  'HIDDEN',
  'PARTIAL',
  'CULLED',
];

const VALID_TREE_STATES = [
  'ACTIVE',
  'INACTIVE',
  'BUILDING',
  'DISPOSED',
];

const VALID_COMPOSITION_STATES = [
  'ACTIVE',
  'INACTIVE',
  'BUILDING',
  'DISPOSED',
  'PENDING',
];

// ─── FACTORY FUNCTIONS ────────────────────────────────────────────────────────

export function createDefaultVisualNodeModel(
  visualNodeId = 'default_visual_node',
  overrides: Partial<VisualNodeModel> = {},
): VisualNodeModel {
  return {
    visualNodeId,
    sceneId: overrides.sceneId || 'default_scene',
    nodeType: overrides.nodeType || 'ROOT',
    nodeState: overrides.nodeState || 'ACTIVE',
    nodeOrder: overrides.nodeOrder !== undefined ? overrides.nodeOrder : 0,
    parentNodeId: overrides.parentNodeId || '',
    childNodeIds: overrides.childNodeIds || [],
    visibilityState: overrides.visibilityState || 'VISIBLE',
    futureRendererHints: overrides.futureRendererHints || {},
    ...overrides,
  };
}

export function createDefaultSceneTreeModel(
  sceneTreeId = 'default_scene_tree',
  overrides: Partial<SceneTreeModel> = {},
): SceneTreeModel {
  return {
    sceneTreeId,
    runtimeId: overrides.runtimeId || 'default_runtime',
    treeName: overrides.treeName || `Tree ${sceneTreeId}`,
    treeState: overrides.treeState || 'ACTIVE',
    rootNodeId: overrides.rootNodeId || '',
    nodeCount: overrides.nodeCount !== undefined ? overrides.nodeCount : 0,
    futureRendererHints: overrides.futureRendererHints || {},
    ...overrides,
  };
}

export function createDefaultLayerCompositionModel(
  layerCompositionId = 'default_layer_composition',
  overrides: Partial<LayerCompositionModel> = {},
): LayerCompositionModel {
  return {
    layerCompositionId,
    sceneTreeId: overrides.sceneTreeId || 'default_scene_tree',
    compositionName: overrides.compositionName || `LayerComposition ${layerCompositionId}`,
    compositionOrder: overrides.compositionOrder !== undefined ? overrides.compositionOrder : 0,
    compositionState: overrides.compositionState || 'ACTIVE',
    layerIds: overrides.layerIds || [],
    futureRendererHints: overrides.futureRendererHints || {},
    ...overrides,
  };
}

export function createDefaultVisualCompositionModel(
  visualCompositionId = 'default_visual_composition',
  overrides: Partial<VisualCompositionModel> = {},
): VisualCompositionModel {
  return {
    visualCompositionId,
    runtimeId: overrides.runtimeId || 'default_runtime',
    compositionName: overrides.compositionName || `VisualComposition ${visualCompositionId}`,
    compositionState: overrides.compositionState || 'ACTIVE',
    compositionOrder: overrides.compositionOrder !== undefined ? overrides.compositionOrder : 0,
    sceneTreeIds: overrides.sceneTreeIds || [],
    layerCompositionIds: overrides.layerCompositionIds || [],
    futureRendererHints: overrides.futureRendererHints || {},
    ...overrides,
  };
}

// ─── MODEL VALIDATORS ─────────────────────────────────────────────────────────

export function validateVisualNodeModel(
  model: VisualNodeModel,
  warnPrefix = '[VisibleRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_VISUAL_NODE', message: 'Visual node model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.visualNodeId) {
    warnings.push({ code: 'INVALID_VISUAL_NODE_ID', message: 'Visual node ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.sceneId) {
    warnings.push({ code: 'INVALID_SCENE_ID', message: `Visual node "${model.visualNodeId}" has empty sceneId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_NODE_TYPES.includes(model.nodeType)) {
    warnings.push({ code: 'INVALID_NODE_TYPE', message: `Visual node "${model.visualNodeId}" has invalid nodeType "${model.nodeType}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_NODE_STATES.includes(model.nodeState)) {
    warnings.push({ code: 'INVALID_NODE_STATE', message: `Visual node "${model.visualNodeId}" has invalid nodeState "${model.nodeState}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.nodeOrder !== 'number') {
    warnings.push({ code: 'INVALID_NODE_ORDER', message: `Visual node "${model.visualNodeId}" has invalid nodeOrder.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_VISIBILITY_STATES.includes(model.visibilityState)) {
    warnings.push({ code: 'INVALID_VISIBILITY_STATE', message: `Visual node "${model.visualNodeId}" has invalid visibilityState "${model.visibilityState}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.childNodeIds)) {
    warnings.push({ code: 'INVALID_CHILD_NODE_IDS', message: `Visual node "${model.visualNodeId}" has invalid childNodeIds (must be an array).` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureRendererHints !== 'object' || model.futureRendererHints === null || Array.isArray(model.futureRendererHints)) {
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `Visual node "${model.visualNodeId}" has invalid futureRendererHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateSceneTreeModel(
  model: SceneTreeModel,
  warnPrefix = '[VisibleRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_SCENE_TREE', message: 'Scene tree model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.sceneTreeId) {
    warnings.push({ code: 'INVALID_SCENE_TREE_ID', message: 'Scene tree ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.runtimeId) {
    warnings.push({ code: 'INVALID_RUNTIME_ID', message: `Scene tree "${model.sceneTreeId}" has empty runtimeId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.treeName) {
    warnings.push({ code: 'INVALID_TREE_NAME', message: `Scene tree "${model.sceneTreeId}" has empty treeName.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_TREE_STATES.includes(model.treeState)) {
    warnings.push({ code: 'INVALID_TREE_STATE', message: `Scene tree "${model.sceneTreeId}" has invalid treeState "${model.treeState}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.nodeCount !== 'number') {
    warnings.push({ code: 'INVALID_NODE_COUNT', message: `Scene tree "${model.sceneTreeId}" has invalid nodeCount.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureRendererHints !== 'object' || model.futureRendererHints === null || Array.isArray(model.futureRendererHints)) {
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `Scene tree "${model.sceneTreeId}" has invalid futureRendererHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateLayerCompositionModel(
  model: LayerCompositionModel,
  warnPrefix = '[VisibleRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_LAYER_COMPOSITION', message: 'Layer composition model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.layerCompositionId) {
    warnings.push({ code: 'INVALID_LAYER_COMPOSITION_ID', message: 'Layer composition ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.sceneTreeId) {
    warnings.push({ code: 'INVALID_SCENE_TREE_ID', message: `Layer composition "${model.layerCompositionId}" has empty sceneTreeId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.compositionName) {
    warnings.push({ code: 'INVALID_COMPOSITION_NAME', message: `Layer composition "${model.layerCompositionId}" has empty compositionName.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.compositionOrder !== 'number') {
    warnings.push({ code: 'INVALID_COMPOSITION_ORDER', message: `Layer composition "${model.layerCompositionId}" has invalid compositionOrder.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_COMPOSITION_STATES.includes(model.compositionState)) {
    warnings.push({ code: 'INVALID_COMPOSITION_STATE', message: `Layer composition "${model.layerCompositionId}" has invalid compositionState "${model.compositionState}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.layerIds)) {
    warnings.push({ code: 'INVALID_LAYER_IDS', message: `Layer composition "${model.layerCompositionId}" has invalid layerIds (must be an array).` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureRendererHints !== 'object' || model.futureRendererHints === null || Array.isArray(model.futureRendererHints)) {
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `Layer composition "${model.layerCompositionId}" has invalid futureRendererHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateVisualCompositionModel(
  model: VisualCompositionModel,
  warnPrefix = '[VisibleRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_VISUAL_COMPOSITION', message: 'Visual composition model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.visualCompositionId) {
    warnings.push({ code: 'INVALID_VISUAL_COMPOSITION_ID', message: 'Visual composition ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.runtimeId) {
    warnings.push({ code: 'INVALID_RUNTIME_ID', message: `Visual composition "${model.visualCompositionId}" has empty runtimeId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.compositionName) {
    warnings.push({ code: 'INVALID_COMPOSITION_NAME', message: `Visual composition "${model.visualCompositionId}" has empty compositionName.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_COMPOSITION_STATES.includes(model.compositionState)) {
    warnings.push({ code: 'INVALID_COMPOSITION_STATE', message: `Visual composition "${model.visualCompositionId}" has invalid compositionState "${model.compositionState}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.compositionOrder !== 'number') {
    warnings.push({ code: 'INVALID_COMPOSITION_ORDER', message: `Visual composition "${model.visualCompositionId}" has invalid compositionOrder.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.sceneTreeIds)) {
    warnings.push({ code: 'INVALID_SCENE_TREE_IDS', message: `Visual composition "${model.visualCompositionId}" has invalid sceneTreeIds (must be an array).` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.layerCompositionIds)) {
    warnings.push({ code: 'INVALID_LAYER_COMPOSITION_IDS', message: `Visual composition "${model.visualCompositionId}" has invalid layerCompositionIds (must be an array).` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureRendererHints !== 'object' || model.futureRendererHints === null || Array.isArray(model.futureRendererHints)) {
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `Visual composition "${model.visualCompositionId}" has invalid futureRendererHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ─── DUPLICATE VALIDATORS ─────────────────────────────────────────────────────

export function validateDuplicateVisualNodeIds(
  models: VisualNodeModel[],
  warnPrefix = '[VisibleRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.visualNodeId)) {
      warnings.push({ code: 'DUPLICATE_VISUAL_NODE_ID', message: `Duplicate visual node ID "${model.visualNodeId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.visualNodeId);
  }
  return warnings;
}

export function validateDuplicateSceneTreeIds(
  models: SceneTreeModel[],
  warnPrefix = '[VisibleRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.sceneTreeId)) {
      warnings.push({ code: 'DUPLICATE_SCENE_TREE_ID', message: `Duplicate scene tree ID "${model.sceneTreeId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.sceneTreeId);
  }
  return warnings;
}

export function validateDuplicateLayerCompositionIds(
  models: LayerCompositionModel[],
  warnPrefix = '[VisibleRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.layerCompositionId)) {
      warnings.push({ code: 'DUPLICATE_LAYER_COMPOSITION_ID', message: `Duplicate layer composition ID "${model.layerCompositionId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.layerCompositionId);
  }
  return warnings;
}

export function validateDuplicateVisualCompositionIds(
  models: VisualCompositionModel[],
  warnPrefix = '[VisibleRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.visualCompositionId)) {
      warnings.push({ code: 'DUPLICATE_VISUAL_COMPOSITION_ID', message: `Duplicate visual composition ID "${model.visualCompositionId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.visualCompositionId);
  }
  return warnings;
}

// ─── SYNCHRONIZER CLASS ────────────────────────────────────────────────────────

export class VisibleRenderingSynchronizer {
  private readonly visualNodeRegistry = new RenderRegistry<VisualNodeModel>();
  private readonly sceneTreeRegistry = new RenderRegistry<SceneTreeModel>();
  private readonly layerCompositionRegistry = new RenderRegistry<LayerCompositionModel>();
  private readonly visualCompositionRegistry = new RenderRegistry<VisualCompositionModel>();

  private readonly warnPrefix = '[VisibleRenderingSynchronizer]';

  public get visualNodes(): RenderRegistry<VisualNodeModel> {
    return this.visualNodeRegistry;
  }

  public get sceneTrees(): RenderRegistry<SceneTreeModel> {
    return this.sceneTreeRegistry;
  }

  public get layerCompositions(): RenderRegistry<LayerCompositionModel> {
    return this.layerCompositionRegistry;
  }

  public get visualCompositions(): RenderRegistry<VisualCompositionModel> {
    return this.visualCompositionRegistry;
  }

  public buildSnapshot(
    visualNodeModels: VisualNodeModel[] = [],
    sceneTreeModels: SceneTreeModel[] = [],
    layerCompositionModels: LayerCompositionModel[] = [],
    visualCompositionModels: VisualCompositionModel[] = [],
  ): VisibleRenderingSnapshot {
    validateDuplicateVisualNodeIds(visualNodeModels, this.warnPrefix);
    validateDuplicateSceneTreeIds(sceneTreeModels, this.warnPrefix);
    validateDuplicateLayerCompositionIds(layerCompositionModels, this.warnPrefix);
    validateDuplicateVisualCompositionIds(visualCompositionModels, this.warnPrefix);

    for (const m of visualNodeModels) {
      validateVisualNodeModel(m, this.warnPrefix);
      this.visualNodeRegistry.register(m.visualNodeId, m, this.warnPrefix);
    }
    for (const m of sceneTreeModels) {
      validateSceneTreeModel(m, this.warnPrefix);
      this.sceneTreeRegistry.register(m.sceneTreeId, m, this.warnPrefix);
    }
    for (const m of layerCompositionModels) {
      validateLayerCompositionModel(m, this.warnPrefix);
      this.layerCompositionRegistry.register(m.layerCompositionId, m, this.warnPrefix);
    }
    for (const m of visualCompositionModels) {
      validateVisualCompositionModel(m, this.warnPrefix);
      this.visualCompositionRegistry.register(m.visualCompositionId, m, this.warnPrefix);
    }

    return {
      visualNodes: safeDeepCopy(visualNodeModels),
      sceneTrees: safeDeepCopy(sceneTreeModels),
      layerCompositions: safeDeepCopy(layerCompositionModels),
      visualCompositions: safeDeepCopy(visualCompositionModels),
    };
  }

  public clear(): void {
    this.visualNodeRegistry.clear();
    this.sceneTreeRegistry.clear();
    this.layerCompositionRegistry.clear();
    this.visualCompositionRegistry.clear();
  }

  public clone(): VisibleRenderingSynchronizer {
    const cloned = new VisibleRenderingSynchronizer();
    cloned.visualNodeRegistry.fromJSON(
      this.visualNodeRegistry.getAll(),
      n => n.visualNodeId,
      this.warnPrefix,
    );
    cloned.sceneTreeRegistry.fromJSON(
      this.sceneTreeRegistry.getAll(),
      t => t.sceneTreeId,
      this.warnPrefix,
    );
    cloned.layerCompositionRegistry.fromJSON(
      this.layerCompositionRegistry.getAll(),
      l => l.layerCompositionId,
      this.warnPrefix,
    );
    cloned.visualCompositionRegistry.fromJSON(
      this.visualCompositionRegistry.getAll(),
      v => v.visualCompositionId,
      this.warnPrefix,
    );
    return cloned;
  }

  public toJSON(): {
    visualNodes: VisualNodeModel[];
    sceneTrees: SceneTreeModel[];
    layerCompositions: LayerCompositionModel[];
    visualCompositions: VisualCompositionModel[];
  } {
    return {
      visualNodes: this.visualNodeRegistry.getAll(),
      sceneTrees: this.sceneTreeRegistry.getAll(),
      layerCompositions: this.layerCompositionRegistry.getAll(),
      visualCompositions: this.visualCompositionRegistry.getAll(),
    };
  }

  public fromJSON(data: {
    visualNodes?: VisualNodeModel[];
    sceneTrees?: SceneTreeModel[];
    layerCompositions?: LayerCompositionModel[];
    visualCompositions?: VisualCompositionModel[];
  }): void {
    this.clear();
    if (Array.isArray(data.visualNodes)) {
      for (const m of data.visualNodes) {
        this.visualNodeRegistry.register(m.visualNodeId, m, this.warnPrefix);
      }
    }
    if (Array.isArray(data.sceneTrees)) {
      for (const m of data.sceneTrees) {
        this.sceneTreeRegistry.register(m.sceneTreeId, m, this.warnPrefix);
      }
    }
    if (Array.isArray(data.layerCompositions)) {
      for (const m of data.layerCompositions) {
        this.layerCompositionRegistry.register(m.layerCompositionId, m, this.warnPrefix);
      }
    }
    if (Array.isArray(data.visualCompositions)) {
      for (const m of data.visualCompositions) {
        this.visualCompositionRegistry.register(m.visualCompositionId, m, this.warnPrefix);
      }
    }
  }

  public sync(data: {
    visualNodes?: VisualNodeModel[];
    sceneTrees?: SceneTreeModel[];
    layerCompositions?: LayerCompositionModel[];
    visualCompositions?: VisualCompositionModel[];
  }): void {
    this.fromJSON(data);
  }
}
