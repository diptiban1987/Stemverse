import {
  RenderRuntimeModel,
  RenderPassModel,
  RenderLayerRuntimeModel,
  RenderQueueModel,
  FrameMetadataModel,
  VisibilityState,
  RenderRuntimeSnapshot,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

const DEFAULT_VISIBILITY_STATE: VisibilityState = 'VISIBLE';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createDefaultRenderRuntimeModel(
  runtimeId = 'default_runtime',
  overrides: Partial<RenderRuntimeModel> = {},
): RenderRuntimeModel {
  return {
    runtimeId,
    runtimeName: overrides.runtimeName || `Render Runtime ${runtimeId}`,
    runtimeVersion: '1.0.0',
    runtimeState: 'INITIALIZED',
    runtimeMode: 'NORMAL',
    visibilityState: DEFAULT_VISIBILITY_STATE,
    futureRendererHints: {},
    ...overrides,
  };
}

export function createDefaultRenderPassModel(
  renderPassId = 'default_pass',
  overrides: Partial<RenderPassModel> = {},
): RenderPassModel {
  return {
    renderPassId,
    runtimeId: overrides.runtimeId || 'default_runtime',
    passName: overrides.passName || `Pass ${renderPassId}`,
    passType: 'OPAQUE',
    passOrder: 0,
    passState: 'PENDING',
    futureExecutionHints: {},
    ...overrides,
  };
}

export function createDefaultRenderLayerRuntimeModel(
  layerRuntimeId = 'default_layer_runtime',
  overrides: Partial<RenderLayerRuntimeModel> = {},
): RenderLayerRuntimeModel {
  return {
    layerRuntimeId,
    layerId: overrides.layerId || `layer_${layerRuntimeId}`,
    layerName: overrides.layerName || `Layer ${layerRuntimeId}`,
    layerType: 'DEFAULT',
    layerOrder: 0,
    layerState: 'ACTIVE',
    futureRendererHints: {},
    ...overrides,
  };
}

export function createDefaultRenderQueueModel(
  queueId = 'default_queue',
  overrides: Partial<RenderQueueModel> = {},
): RenderQueueModel {
  return {
    queueId,
    runtimeId: overrides.runtimeId || 'default_runtime',
    queueName: overrides.queueName || `Queue ${queueId}`,
    queuePriority: 1,
    queueState: 'ACTIVE',
    queueMetadata: {},
    futureExecutionHints: {},
    ...overrides,
  };
}

export function createDefaultFrameMetadataModel(
  frameId = 'default_frame',
  overrides: Partial<FrameMetadataModel> = {},
): FrameMetadataModel {
  return {
    frameId,
    runtimeId: overrides.runtimeId || 'default_runtime',
    frameNumber: 0,
    frameState: 'READY',
    frameMetadata: {},
    futureRendererHints: {},
    ...overrides,
  };
}

const VALID_VISIBILITY_STATES: VisibilityState[] = [
  'VISIBLE', 'HIDDEN', 'PARENT_HIDDEN',
];

export function validateRenderRuntimeModel(
  model: RenderRuntimeModel,
  warnPrefix = '[RenderRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_RENDER_RUNTIME', message: 'Render runtime model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.runtimeId) {
    warnings.push({ code: 'INVALID_RUNTIME_ID', message: 'Render runtime ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.runtimeName) {
    warnings.push({ code: 'INVALID_RUNTIME_NAME', message: `Render runtime "${model.runtimeId}" has empty runtimeName.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.runtimeVersion) {
    warnings.push({ code: 'INVALID_RUNTIME_VERSION', message: `Render runtime "${model.runtimeId}" has empty runtimeVersion.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.runtimeState) {
    warnings.push({ code: 'INVALID_RUNTIME_STATE', message: `Render runtime "${model.runtimeId}" has empty runtimeState.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.runtimeMode) {
    warnings.push({ code: 'INVALID_RUNTIME_MODE', message: `Render runtime "${model.runtimeId}" has empty runtimeMode.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_VISIBILITY_STATES.includes(model.visibilityState)) {
    warnings.push({ code: 'INVALID_VISIBILITY_STATE', message: `Render runtime "${model.runtimeId}" has invalid visibilityState "${model.visibilityState}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureRendererHints !== 'object' || model.futureRendererHints === null || Array.isArray(model.futureRendererHints)) {
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `Render runtime "${model.runtimeId}" has invalid futureRendererHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateRenderPassModel(
  model: RenderPassModel,
  warnPrefix = '[RenderRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_RENDER_PASS', message: 'Render pass model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.renderPassId) {
    warnings.push({ code: 'INVALID_PASS_ID', message: 'Render pass ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.runtimeId) {
    warnings.push({ code: 'INVALID_RUNTIME_ID', message: `Render pass "${model.renderPassId}" has empty runtimeId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.passName) {
    warnings.push({ code: 'INVALID_PASS_NAME', message: `Render pass "${model.renderPassId}" has empty passName.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.passType) {
    warnings.push({ code: 'INVALID_PASS_TYPE', message: `Render pass "${model.renderPassId}" has empty passType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.passOrder !== 'number') {
    warnings.push({ code: 'INVALID_PASS_ORDER', message: `Render pass "${model.renderPassId}" has invalid passOrder.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.passState) {
    warnings.push({ code: 'INVALID_PASS_STATE', message: `Render pass "${model.renderPassId}" has empty passState.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureExecutionHints !== 'object' || model.futureExecutionHints === null || Array.isArray(model.futureExecutionHints)) {
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `Render pass "${model.renderPassId}" has invalid futureExecutionHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateRenderLayerRuntimeModel(
  model: RenderLayerRuntimeModel,
  warnPrefix = '[RenderRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_RENDER_LAYER', message: 'Render layer model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.layerRuntimeId) {
    warnings.push({ code: 'INVALID_LAYER_RUNTIME_ID', message: 'Render layer runtime ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.layerId) {
    warnings.push({ code: 'INVALID_LAYER_ID', message: `Render layer "${model.layerRuntimeId}" has empty layerId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.layerName) {
    warnings.push({ code: 'INVALID_LAYER_NAME', message: `Render layer "${model.layerRuntimeId}" has empty layerName.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.layerType) {
    warnings.push({ code: 'INVALID_LAYER_TYPE', message: `Render layer "${model.layerRuntimeId}" has empty layerType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.layerOrder !== 'number') {
    warnings.push({ code: 'INVALID_LAYER_ORDER', message: `Render layer "${model.layerRuntimeId}" has invalid layerOrder.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.layerState) {
    warnings.push({ code: 'INVALID_LAYER_STATE', message: `Render layer "${model.layerRuntimeId}" has empty layerState.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureRendererHints !== 'object' || model.futureRendererHints === null || Array.isArray(model.futureRendererHints)) {
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `Render layer "${model.layerRuntimeId}" has invalid futureRendererHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateRenderQueueModel(
  model: RenderQueueModel,
  warnPrefix = '[RenderRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_RENDER_QUEUE', message: 'Render queue model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.queueId) {
    warnings.push({ code: 'INVALID_QUEUE_ID', message: 'Render queue ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.runtimeId) {
    warnings.push({ code: 'INVALID_RUNTIME_ID', message: `Render queue "${model.queueId}" has empty runtimeId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.queueName) {
    warnings.push({ code: 'INVALID_QUEUE_NAME', message: `Render queue "${model.queueId}" has empty queueName.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.queuePriority !== 'number') {
    warnings.push({ code: 'INVALID_QUEUE_PRIORITY', message: `Render queue "${model.queueId}" has invalid queuePriority.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.queueState) {
    warnings.push({ code: 'INVALID_QUEUE_STATE', message: `Render queue "${model.queueId}" has empty queueState.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.queueMetadata !== 'object' || model.queueMetadata === null || Array.isArray(model.queueMetadata)) {
    warnings.push({ code: 'INVALID_QUEUE_METADATA', message: `Render queue "${model.queueId}" has invalid queueMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureExecutionHints !== 'object' || model.futureExecutionHints === null || Array.isArray(model.futureExecutionHints)) {
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `Render queue "${model.queueId}" has invalid futureExecutionHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateFrameMetadataModel(
  model: FrameMetadataModel,
  warnPrefix = '[RenderRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_FRAME_METADATA', message: 'Frame metadata model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.frameId) {
    warnings.push({ code: 'INVALID_FRAME_ID', message: 'Frame ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.runtimeId) {
    warnings.push({ code: 'INVALID_RUNTIME_ID', message: `Frame "${model.frameId}" has empty runtimeId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.frameNumber !== 'number') {
    warnings.push({ code: 'INVALID_FRAME_NUMBER', message: `Frame "${model.frameId}" has invalid frameNumber.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.frameState) {
    warnings.push({ code: 'INVALID_FRAME_STATE', message: `Frame "${model.frameId}" has empty frameState.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.frameMetadata !== 'object' || model.frameMetadata === null || Array.isArray(model.frameMetadata)) {
    warnings.push({ code: 'INVALID_FRAME_METADATA_PROP', message: `Frame "${model.frameId}" has invalid frameMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureRendererHints !== 'object' || model.futureRendererHints === null || Array.isArray(model.futureRendererHints)) {
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `Frame "${model.frameId}" has invalid futureRendererHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateDuplicateRenderRuntimeIds(
  models: RenderRuntimeModel[],
  warnPrefix = '[RenderRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.runtimeId)) {
      warnings.push({ code: 'DUPLICATE_RUNTIME_ID', message: `Duplicate render runtime ID "${model.runtimeId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.runtimeId);
  }
  return warnings;
}

export function validateDuplicateRenderPassIds(
  models: RenderPassModel[],
  warnPrefix = '[RenderRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.renderPassId)) {
      warnings.push({ code: 'DUPLICATE_PASS_ID', message: `Duplicate render pass ID "${model.renderPassId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.renderPassId);
  }
  return warnings;
}

export function validateDuplicateRenderLayerIds(
  models: RenderLayerRuntimeModel[],
  warnPrefix = '[RenderRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.layerRuntimeId)) {
      warnings.push({ code: 'DUPLICATE_LAYER_RUNTIME_ID', message: `Duplicate render layer runtime ID "${model.layerRuntimeId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.layerRuntimeId);
  }
  return warnings;
}

export function validateDuplicateRenderQueueIds(
  models: RenderQueueModel[],
  warnPrefix = '[RenderRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.queueId)) {
      warnings.push({ code: 'DUPLICATE_QUEUE_ID', message: `Duplicate render queue ID "${model.queueId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.queueId);
  }
  return warnings;
}

export function validateDuplicateFrameIds(
  models: FrameMetadataModel[],
  warnPrefix = '[RenderRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.frameId)) {
      warnings.push({ code: 'DUPLICATE_FRAME_ID', message: `Duplicate frame ID "${model.frameId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.frameId);
  }
  return warnings;
}

export class RenderRuntimeSynchronizer {
  private readonly renderRuntimeRegistry = new RenderRegistry<RenderRuntimeModel>();
  private readonly renderPassRegistry = new RenderRegistry<RenderPassModel>();
  private readonly renderLayerRegistry = new RenderRegistry<RenderLayerRuntimeModel>();
  private readonly renderQueueRegistry = new RenderRegistry<RenderQueueModel>();
  private readonly frameRegistry = new RenderRegistry<FrameMetadataModel>();

  private readonly warnPrefix = '[RenderRuntimeSynchronizer]';

  public get renderRuntimes(): RenderRegistry<RenderRuntimeModel> {
    return this.renderRuntimeRegistry;
  }

  public get renderPasses(): RenderRegistry<RenderPassModel> {
    return this.renderPassRegistry;
  }

  public get renderLayers(): RenderRegistry<RenderLayerRuntimeModel> {
    return this.renderLayerRegistry;
  }

  public get renderQueues(): RenderRegistry<RenderQueueModel> {
    return this.renderQueueRegistry;
  }

  public get frames(): RenderRegistry<FrameMetadataModel> {
    return this.frameRegistry;
  }

  public buildSnapshot(
    runtimeModels: RenderRuntimeModel[] = [],
    passModels: RenderPassModel[] = [],
    layerModels: RenderLayerRuntimeModel[] = [],
    queueModels: RenderQueueModel[] = [],
    frameModels: FrameMetadataModel[] = [],
  ): RenderRuntimeSnapshot {
    validateDuplicateRenderRuntimeIds(runtimeModels, this.warnPrefix);
    validateDuplicateRenderPassIds(passModels, this.warnPrefix);
    validateDuplicateRenderLayerIds(layerModels, this.warnPrefix);
    validateDuplicateRenderQueueIds(queueModels, this.warnPrefix);
    validateDuplicateFrameIds(frameModels, this.warnPrefix);

    for (const m of runtimeModels) {
      validateRenderRuntimeModel(m, this.warnPrefix);
      this.renderRuntimeRegistry.register(m.runtimeId, m, this.warnPrefix);
    }
    for (const m of passModels) {
      validateRenderPassModel(m, this.warnPrefix);
      this.renderPassRegistry.register(m.renderPassId, m, this.warnPrefix);
    }
    for (const m of layerModels) {
      validateRenderLayerRuntimeModel(m, this.warnPrefix);
      this.renderLayerRegistry.register(m.layerRuntimeId, m, this.warnPrefix);
    }
    for (const m of queueModels) {
      validateRenderQueueModel(m, this.warnPrefix);
      this.renderQueueRegistry.register(m.queueId, m, this.warnPrefix);
    }
    for (const m of frameModels) {
      validateFrameMetadataModel(m, this.warnPrefix);
      this.frameRegistry.register(m.frameId, m, this.warnPrefix);
    }

    return {
      renderRuntimes: safeDeepCopy(runtimeModels),
      renderPasses: safeDeepCopy(passModels),
      renderLayers: safeDeepCopy(layerModels),
      renderQueues: safeDeepCopy(queueModels),
      frames: safeDeepCopy(frameModels),
    };
  }

  public clear(): void {
    this.renderRuntimeRegistry.clear();
    this.renderPassRegistry.clear();
    this.renderLayerRegistry.clear();
    this.renderQueueRegistry.clear();
    this.frameRegistry.clear();
  }

  public clone(): RenderRuntimeSynchronizer {
    const cloned = new RenderRuntimeSynchronizer();
    cloned.renderRuntimeRegistry.fromJSON(this.renderRuntimeRegistry.getAll(), r => r.runtimeId, this.warnPrefix);
    cloned.renderPassRegistry.fromJSON(this.renderPassRegistry.getAll(), p => p.renderPassId, this.warnPrefix);
    cloned.renderLayerRegistry.fromJSON(this.renderLayerRegistry.getAll(), l => l.layerRuntimeId, this.warnPrefix);
    cloned.renderQueueRegistry.fromJSON(this.renderQueueRegistry.getAll(), q => q.queueId, this.warnPrefix);
    cloned.frameRegistry.fromJSON(this.frameRegistry.getAll(), f => f.frameId, this.warnPrefix);
    return cloned;
  }

  public toJSON(): {
    renderRuntimes: RenderRuntimeModel[];
    renderPasses: RenderPassModel[];
    renderLayers: RenderLayerRuntimeModel[];
    renderQueues: RenderQueueModel[];
    frames: FrameMetadataModel[];
  } {
    return {
      renderRuntimes: this.renderRuntimeRegistry.getAll(),
      renderPasses: this.renderPassRegistry.getAll(),
      renderLayers: this.renderLayerRegistry.getAll(),
      renderQueues: this.renderQueueRegistry.getAll(),
      frames: this.frameRegistry.getAll(),
    };
  }

  public fromJSON(data: {
    renderRuntimes?: RenderRuntimeModel[];
    renderPasses?: RenderPassModel[];
    renderLayers?: RenderLayerRuntimeModel[];
    renderQueues?: RenderQueueModel[];
    frames?: FrameMetadataModel[];
  }): void {
    this.clear();
    if (Array.isArray(data.renderRuntimes)) {
      for (const m of data.renderRuntimes) {
        this.renderRuntimeRegistry.register(m.runtimeId, m, this.warnPrefix);
      }
    }
    if (Array.isArray(data.renderPasses)) {
      for (const m of data.renderPasses) {
        this.renderPassRegistry.register(m.renderPassId, m, this.warnPrefix);
      }
    }
    if (Array.isArray(data.renderLayers)) {
      for (const m of data.renderLayers) {
        this.renderLayerRegistry.register(m.layerRuntimeId, m, this.warnPrefix);
      }
    }
    if (Array.isArray(data.renderQueues)) {
      for (const m of data.renderQueues) {
        this.renderQueueRegistry.register(m.queueId, m, this.warnPrefix);
      }
    }
    if (Array.isArray(data.frames)) {
      for (const m of data.frames) {
        this.frameRegistry.register(m.frameId, m, this.warnPrefix);
      }
    }
  }

  public sync(data: {
    renderRuntimes?: RenderRuntimeModel[];
    renderPasses?: RenderPassModel[];
    renderLayers?: RenderLayerRuntimeModel[];
    renderQueues?: RenderQueueModel[];
    frames?: FrameMetadataModel[];
  }): void {
    this.fromJSON(data);
  }
}
