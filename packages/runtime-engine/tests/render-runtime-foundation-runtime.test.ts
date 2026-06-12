import { describe, it, expect } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import {
  RenderRuntimeModel,
  RenderPassModel,
  RenderLayerRuntimeModel,
  RenderQueueModel,
  FrameMetadataModel,
  StageState,
} from '../src/types';
import {
  createDefaultRenderRuntimeModel,
  createDefaultRenderPassModel,
  createDefaultRenderLayerRuntimeModel,
  createDefaultRenderQueueModel,
  createDefaultFrameMetadataModel,
  validateRenderRuntimeModel,
  validateRenderPassModel,
  validateRenderLayerRuntimeModel,
  validateRenderQueueModel,
  validateFrameMetadataModel,
  validateDuplicateRenderRuntimeIds,
  validateDuplicateRenderPassIds,
  validateDuplicateRenderLayerIds,
  validateDuplicateRenderQueueIds,
  validateDuplicateFrameIds,
  RenderRuntimeSynchronizer,
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

function renderRuntime(i: number, id?: string, overrides: Partial<RenderRuntimeModel> = {}): RenderRuntimeModel {
  return createDefaultRenderRuntimeModel(id || `runtime_${i}`, {
    runtimeName: `Render Runtime ${i}`,
    runtimeVersion: '1.0.0',
    runtimeState: 'INITIALIZED',
    runtimeMode: 'NORMAL',
    visibilityState: 'VISIBLE',
    futureRendererHints: {},
    ...overrides,
  });
}

function renderPass(i: number, id?: string, overrides: Partial<RenderPassModel> = {}): RenderPassModel {
  return createDefaultRenderPassModel(id || `pass_${i}`, {
    runtimeId: `runtime_${i}`,
    passName: `Pass ${i}`,
    passType: 'OPAQUE',
    passOrder: i,
    passState: 'PENDING',
    futureExecutionHints: {},
    ...overrides,
  });
}

function renderLayer(i: number, id?: string, overrides: Partial<RenderLayerRuntimeModel> = {}): RenderLayerRuntimeModel {
  return createDefaultRenderLayerRuntimeModel(id || `layer_${i}`, {
    layerId: `layer_${i}`,
    layerName: `Layer ${i}`,
    layerType: 'DEFAULT',
    layerOrder: i,
    layerState: 'ACTIVE',
    futureRendererHints: {},
    ...overrides,
  });
}

function renderQueue(i: number, id?: string, overrides: Partial<RenderQueueModel> = {}): RenderQueueModel {
  return createDefaultRenderQueueModel(id || `queue_${i}`, {
    runtimeId: `runtime_${i}`,
    queueName: `Queue ${i}`,
    queuePriority: i,
    queueState: 'ACTIVE',
    queueMetadata: {},
    futureExecutionHints: {},
    ...overrides,
  });
}

function frameMetadata(i: number, id?: string, overrides: Partial<FrameMetadataModel> = {}): FrameMetadataModel {
  return createDefaultFrameMetadataModel(id || `frame_${i}`, {
    runtimeId: `runtime_${i}`,
    frameNumber: i,
    frameState: 'READY',
    frameMetadata: {},
    futureRendererHints: {},
    ...overrides,
  });
}

describe('Phase 14A: Visual Rendering Runtime Foundation Runtime Tests', () => {

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: CRUD Operations (5 models)
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 1: RenderRuntimeModel CRUD', () => {
    for (let i = 0; i < 300; i++) {
      it(`registers and retrieves render runtime models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderRuntime(i);
        rt.registerRenderRuntimeModel(model);
        expect(rt.getRenderRuntimeModel(model.runtimeId)).toEqual(model);
      });

      it(`returns all registered render runtimes - iteration ${i}`, () => {
        const rt = runtime();
        const model1 = renderRuntime(i, `r1_${i}`);
        const model2 = renderRuntime(i, `r2_${i}`);
        rt.registerRenderRuntimeModel(model1);
        rt.registerRenderRuntimeModel(model2);
        expect(rt.getRenderRuntimeModels()).toEqual([model1, model2]);
      });

      it(`updates registered render runtime models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderRuntime(i);
        rt.registerRenderRuntimeModel(model);
        rt.updateRenderRuntimeModel(model.runtimeId, { runtimeState: 'RUNNING', runtimeMode: 'DEBUG' });
        const retrieved = rt.getRenderRuntimeModel(model.runtimeId);
        expect(retrieved?.runtimeState).toBe('RUNNING');
        expect(retrieved?.runtimeMode).toBe('DEBUG');
      });

      it(`removes registered render runtime models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderRuntime(i);
        rt.registerRenderRuntimeModel(model);
        rt.removeRenderRuntimeModel(model.runtimeId);
        expect(rt.getRenderRuntimeModel(model.runtimeId)).toBeUndefined();
      });

      it(`clears all registered render runtime models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerRenderRuntimeModel(renderRuntime(i, `r1_${i}`));
        rt.registerRenderRuntimeModel(renderRuntime(i, `r2_${i}`));
        rt.clearRenderRuntimeModels();
        expect(rt.getRenderRuntimeModels().length).toBe(0);
      });

      it(`returns keys of registered render runtime models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderRuntime(i);
        rt.registerRenderRuntimeModel(model);
        expect(rt.getRenderRuntimeModelKeys()).toContain(model.runtimeId);
      });

      it(`checks presence of render runtime models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderRuntime(i);
        rt.registerRenderRuntimeModel(model);
        expect(rt.hasRenderRuntimeModel(model.runtimeId)).toBe(true);
        expect(rt.hasRenderRuntimeModel('non-existent')).toBe(false);
      });

      it(`handles retrieving cleaned/non-existent render runtime models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerRenderRuntimeModel(renderRuntime(i));
        rt.clearRenderRuntimeModels();
        expect(rt.getRenderRuntimeModel(`runtime_${i}`)).toBeUndefined();
      });
    }
  });

  describe('SECTION 1: RenderPassModel CRUD', () => {
    for (let i = 0; i < 300; i++) {
      it(`registers and retrieves render pass models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderPass(i);
        rt.registerRenderPassModel(model);
        expect(rt.getRenderPassModel(model.renderPassId)).toEqual(model);
      });

      it(`returns all registered render passes - iteration ${i}`, () => {
        const rt = runtime();
        const model1 = renderPass(i, `p1_${i}`);
        const model2 = renderPass(i, `p2_${i}`);
        rt.registerRenderPassModel(model1);
        rt.registerRenderPassModel(model2);
        expect(rt.getRenderPassModels()).toEqual([model1, model2]);
      });

      it(`updates registered render pass models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderPass(i);
        rt.registerRenderPassModel(model);
        rt.updateRenderPassModel(model.renderPassId, { passState: 'COMPLETED', passOrder: 99 });
        const retrieved = rt.getRenderPassModel(model.renderPassId);
        expect(retrieved?.passState).toBe('COMPLETED');
        expect(retrieved?.passOrder).toBe(99);
      });

      it(`removes registered render pass models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderPass(i);
        rt.registerRenderPassModel(model);
        rt.removeRenderPassModel(model.renderPassId);
        expect(rt.getRenderPassModel(model.renderPassId)).toBeUndefined();
      });

      it(`clears all registered render pass models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerRenderPassModel(renderPass(i, `p1_${i}`));
        rt.registerRenderPassModel(renderPass(i, `p2_${i}`));
        rt.clearRenderPassModels();
        expect(rt.getRenderPassModels().length).toBe(0);
      });

      it(`returns keys of registered render pass models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderPass(i);
        rt.registerRenderPassModel(model);
        expect(rt.getRenderPassModelKeys()).toContain(model.renderPassId);
      });

      it(`checks presence of render pass models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderPass(i);
        rt.registerRenderPassModel(model);
        expect(rt.hasRenderPassModel(model.renderPassId)).toBe(true);
        expect(rt.hasRenderPassModel('non-existent')).toBe(false);
      });

      it(`handles retrieving cleaned/non-existent render pass models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerRenderPassModel(renderPass(i));
        rt.clearRenderPassModels();
        expect(rt.getRenderPassModel(`pass_${i}`)).toBeUndefined();
      });
    }
  });

  describe('SECTION 1: RenderLayerRuntimeModel CRUD', () => {
    for (let i = 0; i < 300; i++) {
      it(`registers and retrieves render layer runtime models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderLayer(i);
        rt.registerRenderLayerRuntimeModel(model);
        expect(rt.getRenderLayerRuntimeModel(model.layerRuntimeId)).toEqual(model);
      });

      it(`returns all registered render layers - iteration ${i}`, () => {
        const rt = runtime();
        const model1 = renderLayer(i, `l1_${i}`);
        const model2 = renderLayer(i, `l2_${i}`);
        rt.registerRenderLayerRuntimeModel(model1);
        rt.registerRenderLayerRuntimeModel(model2);
        expect(rt.getRenderLayerRuntimeModels()).toEqual([model1, model2]);
      });

      it(`updates registered render layer runtime models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderLayer(i);
        rt.registerRenderLayerRuntimeModel(model);
        rt.updateRenderLayerRuntimeModel(model.layerRuntimeId, { layerState: 'SUSPENDED', layerOrder: 200 });
        const retrieved = rt.getRenderLayerRuntimeModel(model.layerRuntimeId);
        expect(retrieved?.layerState).toBe('SUSPENDED');
        expect(retrieved?.layerOrder).toBe(200);
      });

      it(`removes registered render layer runtime models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderLayer(i);
        rt.registerRenderLayerRuntimeModel(model);
        rt.removeRenderLayerRuntimeModel(model.layerRuntimeId);
        expect(rt.getRenderLayerRuntimeModel(model.layerRuntimeId)).toBeUndefined();
      });

      it(`clears all registered render layer runtime models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerRenderLayerRuntimeModel(renderLayer(i, `l1_${i}`));
        rt.registerRenderLayerRuntimeModel(renderLayer(i, `l2_${i}`));
        rt.clearRenderLayerRuntimeModels();
        expect(rt.getRenderLayerRuntimeModels().length).toBe(0);
      });

      it(`returns keys of registered render layer runtime models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderLayer(i);
        rt.registerRenderLayerRuntimeModel(model);
        expect(rt.getRenderLayerRuntimeModelKeys()).toContain(model.layerRuntimeId);
      });

      it(`checks presence of render layer runtime models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderLayer(i);
        rt.registerRenderLayerRuntimeModel(model);
        expect(rt.hasRenderLayerRuntimeModel(model.layerRuntimeId)).toBe(true);
        expect(rt.hasRenderLayerRuntimeModel('non-existent')).toBe(false);
      });

      it(`handles retrieving cleaned/non-existent render layer runtime models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerRenderLayerRuntimeModel(renderLayer(i));
        rt.clearRenderLayerRuntimeModels();
        expect(rt.getRenderLayerRuntimeModel(`layer_${i}`)).toBeUndefined();
      });
    }
  });

  describe('SECTION 1: RenderQueueModel CRUD', () => {
    for (let i = 0; i < 300; i++) {
      it(`registers and retrieves render queue models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderQueue(i);
        rt.registerRenderQueueModel(model);
        expect(rt.getRenderQueueModel(model.queueId)).toEqual(model);
      });

      it(`returns all registered render queues - iteration ${i}`, () => {
        const rt = runtime();
        const model1 = renderQueue(i, `q1_${i}`);
        const model2 = renderQueue(i, `q2_${i}`);
        rt.registerRenderQueueModel(model1);
        rt.registerRenderQueueModel(model2);
        expect(rt.getRenderQueueModels()).toEqual([model1, model2]);
      });

      it(`updates registered render queue models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderQueue(i);
        rt.registerRenderQueueModel(model);
        rt.updateRenderQueueModel(model.queueId, { queueState: 'PAUSED', queuePriority: 10 });
        const retrieved = rt.getRenderQueueModel(model.queueId);
        expect(retrieved?.queueState).toBe('PAUSED');
        expect(retrieved?.queuePriority).toBe(10);
      });

      it(`removes registered render queue models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderQueue(i);
        rt.registerRenderQueueModel(model);
        rt.removeRenderQueueModel(model.queueId);
        expect(rt.getRenderQueueModel(model.queueId)).toBeUndefined();
      });

      it(`clears all registered render queue models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerRenderQueueModel(renderQueue(i, `q1_${i}`));
        rt.registerRenderQueueModel(renderQueue(i, `q2_${i}`));
        rt.clearRenderQueueModels();
        expect(rt.getRenderQueueModels().length).toBe(0);
      });

      it(`returns keys of registered render queue models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderQueue(i);
        rt.registerRenderQueueModel(model);
        expect(rt.getRenderQueueModelKeys()).toContain(model.queueId);
      });

      it(`checks presence of render queue models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderQueue(i);
        rt.registerRenderQueueModel(model);
        expect(rt.hasRenderQueueModel(model.queueId)).toBe(true);
        expect(rt.hasRenderQueueModel('non-existent')).toBe(false);
      });

      it(`handles retrieving cleaned/non-existent render queue models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerRenderQueueModel(renderQueue(i));
        rt.clearRenderQueueModels();
        expect(rt.getRenderQueueModel(`queue_${i}`)).toBeUndefined();
      });
    }
  });

  describe('SECTION 1: FrameMetadataModel CRUD', () => {
    for (let i = 0; i < 300; i++) {
      it(`registers and retrieves frame metadata models - iteration ${i}`, () => {
        const rt = runtime();
        const model = frameMetadata(i);
        rt.registerFrameMetadataModel(model);
        expect(rt.getFrameMetadataModel(model.frameId)).toEqual(model);
      });

      it(`returns all registered frame metadata - iteration ${i}`, () => {
        const rt = runtime();
        const model1 = frameMetadata(i, `f1_${i}`);
        const model2 = frameMetadata(i, `f2_${i}`);
        rt.registerFrameMetadataModel(model1);
        rt.registerFrameMetadataModel(model2);
        expect(rt.getFrameMetadataModels()).toEqual([model1, model2]);
      });

      it(`updates registered frame metadata models - iteration ${i}`, () => {
        const rt = runtime();
        const model = frameMetadata(i);
        rt.registerFrameMetadataModel(model);
        rt.updateFrameMetadataModel(model.frameId, { frameState: 'PROCESSING', frameNumber: 450 });
        const retrieved = rt.getFrameMetadataModel(model.frameId);
        expect(retrieved?.frameState).toBe('PROCESSING');
        expect(retrieved?.frameNumber).toBe(450);
      });

      it(`removes registered frame metadata models - iteration ${i}`, () => {
        const rt = runtime();
        const model = frameMetadata(i);
        rt.registerFrameMetadataModel(model);
        rt.removeFrameMetadataModel(model.frameId);
        expect(rt.getFrameMetadataModel(model.frameId)).toBeUndefined();
      });

      it(`clears all registered frame metadata models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerFrameMetadataModel(frameMetadata(i, `f1_${i}`));
        rt.registerFrameMetadataModel(frameMetadata(i, `f2_${i}`));
        rt.clearFrameMetadataModels();
        expect(rt.getFrameMetadataModels().length).toBe(0);
      });

      it(`returns keys of registered frame metadata models - iteration ${i}`, () => {
        const rt = runtime();
        const model = frameMetadata(i);
        rt.registerFrameMetadataModel(model);
        expect(rt.getFrameMetadataModelKeys()).toContain(model.frameId);
      });

      it(`checks presence of frame metadata models - iteration ${i}`, () => {
        const rt = runtime();
        const model = frameMetadata(i);
        rt.registerFrameMetadataModel(model);
        expect(rt.hasFrameMetadataModel(model.frameId)).toBe(true);
        expect(rt.hasFrameMetadataModel('non-existent')).toBe(false);
      });

      it(`handles retrieving cleaned/non-existent frame metadata models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerFrameMetadataModel(frameMetadata(i));
        rt.clearFrameMetadataModels();
        expect(rt.getFrameMetadataModel(`frame_${i}`)).toBeUndefined();
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Factory and Default Values
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 2: Factory Defaults and Overrides', () => {
    for (let i = 0; i < 300; i++) {
      it(`verifies correct default properties from factories - iteration ${i}`, () => {
        const runModel = createDefaultRenderRuntimeModel(`r_${i}`);
        expect(runModel.runtimeId).toBe(`r_${i}`);
        expect(runModel.runtimeName).toBe(`Render Runtime r_${i}`);
        expect(runModel.runtimeVersion).toBe('1.0.0');
        expect(runModel.runtimeState).toBe('INITIALIZED');
        expect(runModel.runtimeMode).toBe('NORMAL');
        expect(runModel.visibilityState).toBe('VISIBLE');
        expect(runModel.futureRendererHints).toEqual({});

        const passModel = createDefaultRenderPassModel(`p_${i}`);
        expect(passModel.renderPassId).toBe(`p_${i}`);
        expect(passModel.runtimeId).toBe('default_runtime');
        expect(passModel.passName).toBe(`Pass p_${i}`);
        expect(passModel.passType).toBe('OPAQUE');
        expect(passModel.passOrder).toBe(0);
        expect(passModel.passState).toBe('PENDING');

        const layModel = createDefaultRenderLayerRuntimeModel(`l_${i}`);
        expect(layModel.layerRuntimeId).toBe(`l_${i}`);
        expect(layModel.layerId).toBe(`layer_l_${i}`);
        expect(layModel.layerName).toBe(`Layer l_${i}`);
        expect(layModel.layerType).toBe('DEFAULT');
        expect(layModel.layerOrder).toBe(0);
        expect(layModel.layerState).toBe('ACTIVE');

        const qModel = createDefaultRenderQueueModel(`q_${i}`);
        expect(qModel.queueId).toBe(`q_${i}`);
        expect(qModel.runtimeId).toBe('default_runtime');
        expect(qModel.queueName).toBe(`Queue q_${i}`);
        expect(qModel.queuePriority).toBe(1);
        expect(qModel.queueState).toBe('ACTIVE');

        const fModel = createDefaultFrameMetadataModel(`f_${i}`);
        expect(fModel.frameId).toBe(`f_${i}`);
        expect(fModel.runtimeId).toBe('default_runtime');
        expect(fModel.frameNumber).toBe(0);
        expect(fModel.frameState).toBe('READY');
      });

      it(`verifies overrides in factories - iteration ${i}`, () => {
        const overrides = { runtimeName: 'Custom Name', runtimeState: 'RUNNING' };
        const runModel = createDefaultRenderRuntimeModel(`r_${i}`, overrides);
        expect(runModel.runtimeName).toBe('Custom Name');
        expect(runModel.runtimeState).toBe('RUNNING');
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Validation and console warnings
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 3: Validation - RenderRuntimeModel', () => {
    for (let i = 0; i < 300; i++) {
      it(`warns on null or empty runtime ID - iteration ${i}`, () => {
        const warningsNull = validateRenderRuntimeModel(null as any);
        expect(warningsNull.length).toBeGreaterThan(0);

        const warningsEmpty = validateRenderRuntimeModel(renderRuntime(i, '', { runtimeId: '' }));
        expect(warningsEmpty.length).toBeGreaterThan(0);
      });

      it(`warns on empty runtimeName - iteration ${i}`, () => {
        const warnings = validateRenderRuntimeModel(renderRuntime(i, `r_${i}`, { runtimeName: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on empty runtimeVersion - iteration ${i}`, () => {
        const warnings = validateRenderRuntimeModel(renderRuntime(i, `r_${i}`, { runtimeVersion: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on empty runtimeState - iteration ${i}`, () => {
        const warnings = validateRenderRuntimeModel(renderRuntime(i, `r_${i}`, { runtimeState: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on empty runtimeMode - iteration ${i}`, () => {
        const warnings = validateRenderRuntimeModel(renderRuntime(i, `r_${i}`, { runtimeMode: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid visibilityState - iteration ${i}`, () => {
        const warnings = validateRenderRuntimeModel(renderRuntime(i, `r_${i}`, { visibilityState: 'INVALID' as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid futureRendererHints - iteration ${i}`, () => {
        const warnings = validateRenderRuntimeModel(renderRuntime(i, `r_${i}`, { futureRendererHints: 'hints' as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });
    }
  });

  describe('SECTION 3: Validation - RenderPassModel', () => {
    for (let i = 0; i < 300; i++) {
      it(`warns on null or empty renderPassId - iteration ${i}`, () => {
        const warningsNull = validateRenderPassModel(null as any);
        expect(warningsNull.length).toBeGreaterThan(0);

        const warningsEmpty = validateRenderPassModel(renderPass(i, '', { renderPassId: '' }));
        expect(warningsEmpty.length).toBeGreaterThan(0);
      });

      it(`warns on empty runtimeId - iteration ${i}`, () => {
        const warnings = validateRenderPassModel(renderPass(i, `p_${i}`, { runtimeId: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on empty passName - iteration ${i}`, () => {
        const warnings = validateRenderPassModel(renderPass(i, `p_${i}`, { passName: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on empty passType - iteration ${i}`, () => {
        const warnings = validateRenderPassModel(renderPass(i, `p_${i}`, { passType: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid passOrder - iteration ${i}`, () => {
        const warnings = validateRenderPassModel(renderPass(i, `p_${i}`, { passOrder: 'first' as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on empty passState - iteration ${i}`, () => {
        const warnings = validateRenderPassModel(renderPass(i, `p_${i}`, { passState: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid futureExecutionHints - iteration ${i}`, () => {
        const warnings = validateRenderPassModel(renderPass(i, `p_${i}`, { futureExecutionHints: null as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });
    }
  });

  describe('SECTION 3: Validation - RenderLayerRuntimeModel', () => {
    for (let i = 0; i < 300; i++) {
      it(`warns on null or empty layerRuntimeId - iteration ${i}`, () => {
        const warningsNull = validateRenderLayerRuntimeModel(null as any);
        expect(warningsNull.length).toBeGreaterThan(0);

        const warningsEmpty = validateRenderLayerRuntimeModel(renderLayer(i, '', { layerRuntimeId: '' }));
        expect(warningsEmpty.length).toBeGreaterThan(0);
      });

      it(`warns on empty layerId - iteration ${i}`, () => {
        const warnings = validateRenderLayerRuntimeModel(renderLayer(i, `l_${i}`, { layerId: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on empty layerName - iteration ${i}`, () => {
        const warnings = validateRenderLayerRuntimeModel(renderLayer(i, `l_${i}`, { layerName: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on empty layerType - iteration ${i}`, () => {
        const warnings = validateRenderLayerRuntimeModel(renderLayer(i, `l_${i}`, { layerType: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid layerOrder - iteration ${i}`, () => {
        const warnings = validateRenderLayerRuntimeModel(renderLayer(i, `l_${i}`, { layerOrder: {} as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on empty layerState - iteration ${i}`, () => {
        const warnings = validateRenderLayerRuntimeModel(renderLayer(i, `l_${i}`, { layerState: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid futureRendererHints - iteration ${i}`, () => {
        const warnings = validateRenderLayerRuntimeModel(renderLayer(i, `l_${i}`, { futureRendererHints: [] as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });
    }
  });

  describe('SECTION 3: Validation - RenderQueueModel', () => {
    for (let i = 0; i < 300; i++) {
      it(`warns on null or empty queueId - iteration ${i}`, () => {
        const warningsNull = validateRenderQueueModel(null as any);
        expect(warningsNull.length).toBeGreaterThan(0);

        const warningsEmpty = validateRenderQueueModel(renderQueue(i, '', { queueId: '' }));
        expect(warningsEmpty.length).toBeGreaterThan(0);
      });

      it(`warns on empty runtimeId - iteration ${i}`, () => {
        const warnings = validateRenderQueueModel(renderQueue(i, `q_${i}`, { runtimeId: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on empty queueName - iteration ${i}`, () => {
        const warnings = validateRenderQueueModel(renderQueue(i, `q_${i}`, { queueName: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid queuePriority - iteration ${i}`, () => {
        const warnings = validateRenderQueueModel(renderQueue(i, `q_${i}`, { queuePriority: 'high' as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on empty queueState - iteration ${i}`, () => {
        const warnings = validateRenderQueueModel(renderQueue(i, `q_${i}`, { queueState: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid queueMetadata - iteration ${i}`, () => {
        const warnings = validateRenderQueueModel(renderQueue(i, `q_${i}`, { queueMetadata: 'meta' as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid futureExecutionHints - iteration ${i}`, () => {
        const warnings = validateRenderQueueModel(renderQueue(i, `q_${i}`, { futureExecutionHints: null as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });
    }
  });

  describe('SECTION 3: Validation - FrameMetadataModel', () => {
    for (let i = 0; i < 300; i++) {
      it(`warns on null or empty frameId - iteration ${i}`, () => {
        const warningsNull = validateFrameMetadataModel(null as any);
        expect(warningsNull.length).toBeGreaterThan(0);

        const warningsEmpty = validateFrameMetadataModel(frameMetadata(i, '', { frameId: '' }));
        expect(warningsEmpty.length).toBeGreaterThan(0);
      });

      it(`warns on empty runtimeId - iteration ${i}`, () => {
        const warnings = validateFrameMetadataModel(frameMetadata(i, `f_${i}`, { runtimeId: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid frameNumber - iteration ${i}`, () => {
        const warnings = validateFrameMetadataModel(frameMetadata(i, `f_${i}`, { frameNumber: 'ten' as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on empty frameState - iteration ${i}`, () => {
        const warnings = validateFrameMetadataModel(frameMetadata(i, `f_${i}`, { frameState: '' }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid frameMetadata - iteration ${i}`, () => {
        const warnings = validateFrameMetadataModel(frameMetadata(i, `f_${i}`, { frameMetadata: 'meta' as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`warns on invalid futureRendererHints - iteration ${i}`, () => {
        const warnings = validateFrameMetadataModel(frameMetadata(i, `f_${i}`, { futureRendererHints: null as any }));
        expect(warnings.length).toBeGreaterThan(0);
      });
    }
  });

  describe('SECTION 3: Duplicate Validators', () => {
    for (let i = 0; i < 300; i++) {
      it(`detects duplicate runtime IDs - iteration ${i}`, () => {
        const warnings = validateDuplicateRenderRuntimeIds([renderRuntime(i, `r_${i}`), renderRuntime(i, `r_${i}`)]);
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`detects duplicate pass IDs - iteration ${i}`, () => {
        const warnings = validateDuplicateRenderPassIds([renderPass(i, `p_${i}`), renderPass(i, `p_${i}`)]);
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`detects duplicate layer IDs - iteration ${i}`, () => {
        const warnings = validateDuplicateRenderLayerIds([renderLayer(i, `l_${i}`), renderLayer(i, `l_${i}`)]);
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`detects duplicate queue IDs - iteration ${i}`, () => {
        const warnings = validateDuplicateRenderQueueIds([renderQueue(i, `q_${i}`), renderQueue(i, `q_${i}`)]);
        expect(warnings.length).toBeGreaterThan(0);
      });

      it(`detects duplicate frame IDs - iteration ${i}`, () => {
        const warnings = validateDuplicateFrameIds([frameMetadata(i, `f_${i}`), frameMetadata(i, `f_${i}`)]);
        expect(warnings.length).toBeGreaterThan(0);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: RenderRuntimeSynchronizer behavior
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 4: RenderRuntimeSynchronizer', () => {
    for (let i = 0; i < 300; i++) {
      it(`builds snapshots and populates registries - iteration ${i}`, () => {
        const sync = new RenderRuntimeSynchronizer();
        const r = renderRuntime(i);
        const p = renderPass(i);
        const l = renderLayer(i);
        const q = renderQueue(i);
        const f = frameMetadata(i);

        const snapshot = sync.buildSnapshot([r], [p], [l], [q], [f]);
        expect(snapshot.renderRuntimes[0]).toEqual(r);
        expect(sync.renderRuntimes.getAll()[0]).toEqual(r);
        expect(sync.renderPasses.getAll()[0]).toEqual(p);
        expect(sync.renderLayers.getAll()[0]).toEqual(l);
        expect(sync.renderQueues.getAll()[0]).toEqual(q);
        expect(sync.frames.getAll()[0]).toEqual(f);
      });

      it(`clones synchronizers properly - iteration ${i}`, () => {
        const sync = new RenderRuntimeSynchronizer();
        sync.buildSnapshot([renderRuntime(i)], [renderPass(i)], [renderLayer(i)], [renderQueue(i)], [frameMetadata(i)]);
        const cloned = sync.clone();
        expect(cloned.renderRuntimes.getAll()).toEqual(sync.renderRuntimes.getAll());
        expect(cloned.renderPasses.getAll()).toEqual(sync.renderPasses.getAll());
      });

      it(`handles serialization round trips in synchronizer - iteration ${i}`, () => {
        const sync = new RenderRuntimeSynchronizer();
        sync.buildSnapshot([renderRuntime(i)], [renderPass(i)], [renderLayer(i)], [renderQueue(i)], [frameMetadata(i)]);
        const json = sync.toJSON();
        const newSync = new RenderRuntimeSynchronizer();
        newSync.fromJSON(json);
        expect(newSync.renderRuntimes.getAll()).toEqual(sync.renderRuntimes.getAll());
      });

      it(`clears all registers in synchronizer - iteration ${i}`, () => {
        const sync = new RenderRuntimeSynchronizer();
        sync.buildSnapshot([renderRuntime(i)], [renderPass(i)], [renderLayer(i)], [renderQueue(i)], [frameMetadata(i)]);
        sync.clear();
        expect(sync.renderRuntimes.getAll().length).toBe(0);
        expect(sync.renderPasses.getAll().length).toBe(0);
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
        rt.registerRenderRuntimeModel(renderRuntime(i));
        rt.registerRenderPassModel(renderPass(i));
        rt.registerRenderLayerRuntimeModel(renderLayer(i));
        rt.registerRenderQueueModel(renderQueue(i));
        rt.registerFrameMetadataModel(frameMetadata(i));

        rt.initialize();
        expect(rt.getRenderRuntimeModels().length).toBe(0);
        expect(rt.getRenderPassModels().length).toBe(0);
        expect(rt.getRenderLayerRuntimeModels().length).toBe(0);
        expect(rt.getRenderQueueModels().length).toBe(0);
        expect(rt.getFrameMetadataModels().length).toBe(0);
      });

      it(`stop clears registries - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerRenderRuntimeModel(renderRuntime(i));
        rt.registerRenderPassModel(renderPass(i));
        rt.registerRenderLayerRuntimeModel(renderLayer(i));
        rt.registerRenderQueueModel(renderQueue(i));
        rt.registerFrameMetadataModel(frameMetadata(i));

        rt.stop();
        expect(rt.getRenderRuntimeModels().length).toBe(0);
        expect(rt.getRenderPassModels().length).toBe(0);
        expect(rt.getRenderLayerRuntimeModels().length).toBe(0);
        expect(rt.getRenderQueueModels().length).toBe(0);
        expect(rt.getFrameMetadataModels().length).toBe(0);
      });

      it(`reset clears registries - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerRenderRuntimeModel(renderRuntime(i));
        rt.registerRenderPassModel(renderPass(i));
        rt.registerRenderLayerRuntimeModel(renderLayer(i));
        rt.registerRenderQueueModel(renderQueue(i));
        rt.registerFrameMetadataModel(frameMetadata(i));

        rt.reset();
        expect(rt.getRenderRuntimeModels().length).toBe(0);
        expect(rt.getRenderPassModels().length).toBe(0);
        expect(rt.getRenderLayerRuntimeModels().length).toBe(0);
        expect(rt.getRenderQueueModels().length).toBe(0);
        expect(rt.getFrameMetadataModels().length).toBe(0);
      });

      it(`destroy clears registries - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerRenderRuntimeModel(renderRuntime(i));
        rt.registerRenderPassModel(renderPass(i));
        rt.registerRenderLayerRuntimeModel(renderLayer(i));
        rt.registerRenderQueueModel(renderQueue(i));
        rt.registerFrameMetadataModel(frameMetadata(i));

        rt.destroy();
        expect(rt.getRenderRuntimeModels().length).toBe(0);
        expect(rt.getRenderPassModels().length).toBe(0);
        expect(rt.getRenderLayerRuntimeModels().length).toBe(0);
        expect(rt.getRenderQueueModels().length).toBe(0);
        expect(rt.getFrameMetadataModels().length).toBe(0);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: Stage Snapshot Integration
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 6: Stage Snapshot Synchronization', () => {
    for (let i = 0; i < 300; i++) {
      it(`snapshots render runtimes - iteration ${i}`, () => {
        const rt = runtime();
        const r = renderRuntime(i);
        rt.registerRenderRuntimeModel(r);
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap?.renderRuntimes?.[0]).toEqual(r);
      });

      it(`snapshots render passes - iteration ${i}`, () => {
        const rt = runtime();
        const p = renderPass(i);
        rt.registerRenderPassModel(p);
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap?.renderPasses?.[0]).toEqual(p);
      });

      it(`snapshots render layers - iteration ${i}`, () => {
        const rt = runtime();
        const l = renderLayer(i);
        rt.registerRenderLayerRuntimeModel(l);
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap?.renderLayers?.[0]).toEqual(l);
      });

      it(`snapshots render queues - iteration ${i}`, () => {
        const rt = runtime();
        const q = renderQueue(i);
        rt.registerRenderQueueModel(q);
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap?.renderQueues?.[0]).toEqual(q);
      });

      it(`snapshots frames - iteration ${i}`, () => {
        const rt = runtime();
        const f = frameMetadata(i);
        rt.registerFrameMetadataModel(f);
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap?.frames?.[0]).toEqual(f);
      });

      it(`does not include fields in snapshot if registries are empty - iteration ${i}`, () => {
        const rt = runtime();
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap?.renderRuntimes).toBeUndefined();
        expect(stageSnap?.renderPasses).toBeUndefined();
        expect(stageSnap?.renderLayers).toBeUndefined();
        expect(stageSnap?.renderQueues).toBeUndefined();
        expect(stageSnap?.frames).toBeUndefined();
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: Serialization Import/Export Safety
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 7: Export/Import Round Trips', () => {
    for (let i = 0; i < 300; i++) {
      it(`preserves render runtimes across export/import round-trips - iteration ${i}`, () => {
        const rt = runtime();
        const r = renderRuntime(i);
        rt.registerRenderRuntimeModel(r);
        const project = rt.exportProject();

        const rtImport = runtime();
        rtImport.importProject(project);
        expect(rtImport.getRenderRuntimeModel(r.runtimeId)).toEqual(r);
      });

      it(`preserves render passes across export/import round-trips - iteration ${i}`, () => {
        const rt = runtime();
        const p = renderPass(i);
        rt.registerRenderPassModel(p);
        const project = rt.exportProject();

        const rtImport = runtime();
        rtImport.importProject(project);
        expect(rtImport.getRenderPassModel(p.renderPassId)).toEqual(p);
      });

      it(`preserves render layers across export/import round-trips - iteration ${i}`, () => {
        const rt = runtime();
        const l = renderLayer(i);
        rt.registerRenderLayerRuntimeModel(l);
        const project = rt.exportProject();

        const rtImport = runtime();
        rtImport.importProject(project);
        expect(rtImport.getRenderLayerRuntimeModel(l.layerRuntimeId)).toEqual(l);
      });

      it(`preserves render queues across export/import round-trips - iteration ${i}`, () => {
        const rt = runtime();
        const q = renderQueue(i);
        rt.registerRenderQueueModel(q);
        const project = rt.exportProject();

        const rtImport = runtime();
        rtImport.importProject(project);
        expect(rtImport.getRenderQueueModel(q.queueId)).toEqual(q);
      });

      it(`preserves frames across export/import round-trips - iteration ${i}`, () => {
        const rt = runtime();
        const f = frameMetadata(i);
        rt.registerFrameMetadataModel(f);
        const project = rt.exportProject();

        const rtImport = runtime();
        rtImport.importProject(project);
        expect(rtImport.getFrameMetadataModel(f.frameId)).toEqual(f);
      });
    }
  });
});
