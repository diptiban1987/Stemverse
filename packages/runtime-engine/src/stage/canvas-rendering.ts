import {
  RenderNodeModel,
  NodeType,
  VisibilityState,
  SceneGraphModel,
  ViewportModel,
  VisibleRegion,
  RenderPipelineModel,
  PipelineType,
  CanvasRenderSnapshot,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

// ─── Default Constants ────────────────────────────────────────────

const DEFAULT_NODE_TYPE: NodeType = 'COMPONENT';
const DEFAULT_VISIBILITY_STATE: VisibilityState = 'VISIBLE';

const DEFAULT_VISIBLE_REGION: VisibleRegion = { x: 0, y: 0, width: 480, height: 360 };

const DEFAULT_VIEWPORT: ViewportModel = {
  viewportId: 'default_viewport',
  width: 480,
  height: 360,
  zoom: 1,
  panX: 0,
  panY: 0,
  visibleRegion: { ...DEFAULT_VISIBLE_REGION },
  futureNavigationHints: {},
};

const DEFAULT_PIPELINE_TYPE: PipelineType = 'FORWARD';

// ─── Factory Functions ────────────────────────────────────────────

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createDefaultRenderNodeModel(
  renderNodeId = 'default_render_node',
  overrides: Partial<RenderNodeModel> = {},
): RenderNodeModel {
  return {
    renderNodeId,
    nodeType: DEFAULT_NODE_TYPE,
    displayName: `Render Node ${renderNodeId}`,
    componentId: undefined,
    wireId: undefined,
    boardId: undefined,
    signalId: undefined,
    animationId: undefined,
    parentNodeId: undefined,
    childNodeIds: [],
    visibilityState: DEFAULT_VISIBILITY_STATE,
    futureRendererHints: {},
    ...overrides,
  };
}

export function createDefaultSceneGraphModel(
  sceneGraphId = 'default_scene_graph',
  overrides: Partial<SceneGraphModel> = {},
): SceneGraphModel {
  return {
    sceneGraphId,
    rootNodeId: 'default_render_node',
    nodeHierarchy: ['default_render_node'],
    layerMembership: ['default_layer'],
    futureOptimizationHints: {},
    ...overrides,
  };
}

export function createDefaultViewportModel(
  viewportId = 'default_viewport',
  overrides: Partial<ViewportModel> = {},
): ViewportModel {
  return {
    viewportId,
    width: 480,
    height: 360,
    zoom: 1,
    panX: 0,
    panY: 0,
    visibleRegion: { ...DEFAULT_VISIBLE_REGION },
    futureNavigationHints: {},
    ...overrides,
  };
}

export function createDefaultRenderPipelineModel(
  pipelineId = 'default_pipeline',
  overrides: Partial<RenderPipelineModel> = {},
): RenderPipelineModel {
  return {
    pipelineId,
    pipelineType: DEFAULT_PIPELINE_TYPE,
    renderOrder: 0,
    enabledLayers: ['default_layer'],
    futureOptimizationHints: {},
    ...overrides,
  };
}

// ─── Validation (warning-only) ────────────────────────────────────

const VALID_NODE_TYPES: NodeType[] = [
  'COMPONENT', 'WIRE', 'BOARD', 'SIGNAL', 'ANIMATION', 'GROUP', 'CUSTOM',
];

const VALID_VISIBILITY_STATES: VisibilityState[] = [
  'VISIBLE', 'HIDDEN', 'PARENT_HIDDEN',
];

const VALID_PIPELINE_TYPES: PipelineType[] = [
  'FORWARD', 'DEFERRED', 'CUSTOM',
];

export function validateRenderNodeModel(
  node: RenderNodeModel,
  warnPrefix = '[CanvasRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!node || typeof node !== 'object') {
    warnings.push({ code: 'INVALID_RENDER_NODE', message: 'Render node is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!node.renderNodeId) {
    warnings.push({ code: 'INVALID_RENDER_NODE_ID', message: 'Render node ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_NODE_TYPES.includes(node.nodeType)) {
    warnings.push({ code: 'INVALID_NODE_TYPE', message: `Invalid node type "${node.nodeType}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!node.displayName) {
    warnings.push({ code: 'INVALID_DISPLAY_NAME', message: `Render node "${node.renderNodeId}" display name is empty.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_VISIBILITY_STATES.includes(node.visibilityState)) {
    warnings.push({ code: 'INVALID_VISIBILITY_STATE', message: `Render node "${node.renderNodeId}" has invalid visibilityState "${node.visibilityState}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(node.childNodeIds)) {
    warnings.push({ code: 'INVALID_CHILD_NODE_IDS', message: `Render node "${node.renderNodeId}" childNodeIds is not an array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (node.parentNodeId === node.renderNodeId) {
    warnings.push({ code: 'SELF_PARENTING_NODE', message: `Render node "${node.renderNodeId}" has itself as parent.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateSceneGraphModel(
  graph: SceneGraphModel,
  warnPrefix = '[CanvasRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!graph || typeof graph !== 'object') {
    warnings.push({ code: 'INVALID_SCENE_GRAPH', message: 'Scene graph is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!graph.sceneGraphId) {
    warnings.push({ code: 'INVALID_SCENE_GRAPH_ID', message: 'Scene graph ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!graph.rootNodeId) {
    warnings.push({ code: 'INVALID_ROOT_NODE_ID', message: `Scene graph "${graph.sceneGraphId}" root node ID is empty.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(graph.nodeHierarchy)) {
    warnings.push({ code: 'INVALID_NODE_HIERARCHY', message: `Scene graph "${graph.sceneGraphId}" nodeHierarchy is not an array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(graph.layerMembership)) {
    warnings.push({ code: 'INVALID_LAYER_MEMBERSHIP', message: `Scene graph "${graph.sceneGraphId}" layerMembership is not an array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (graph.nodeHierarchy && graph.nodeHierarchy.length > 0 && graph.rootNodeId && !graph.nodeHierarchy.includes(graph.rootNodeId)) {
    warnings.push({ code: 'ROOT_NOT_IN_HIERARCHY', message: `Scene graph "${graph.sceneGraphId}" rootNodeId not in nodeHierarchy.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateViewportModel(
  viewport: ViewportModel,
  warnPrefix = '[CanvasRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!viewport || typeof viewport !== 'object') {
    warnings.push({ code: 'INVALID_VIEWPORT', message: 'Viewport is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!viewport.viewportId) {
    warnings.push({ code: 'INVALID_VIEWPORT_ID', message: 'Viewport ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof viewport.width !== 'number' || !Number.isFinite(viewport.width) || viewport.width <= 0) {
    warnings.push({ code: 'INVALID_VIEWPORT_WIDTH', message: `Viewport "${viewport.viewportId}" width must be a positive finite number, got ${viewport.width}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof viewport.height !== 'number' || !Number.isFinite(viewport.height) || viewport.height <= 0) {
    warnings.push({ code: 'INVALID_VIEWPORT_HEIGHT', message: `Viewport "${viewport.viewportId}" height must be a positive finite number, got ${viewport.height}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof viewport.zoom !== 'number' || !Number.isFinite(viewport.zoom) || viewport.zoom <= 0) {
    warnings.push({ code: 'INVALID_VIEWPORT_ZOOM', message: `Viewport "${viewport.viewportId}" zoom must be a positive finite number, got ${viewport.zoom}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof viewport.panX !== 'number' || !Number.isFinite(viewport.panX)) {
    warnings.push({ code: 'INVALID_VIEWPORT_PAN_X', message: `Viewport "${viewport.viewportId}" panX must be a finite number, got ${viewport.panX}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof viewport.panY !== 'number' || !Number.isFinite(viewport.panY)) {
    warnings.push({ code: 'INVALID_VIEWPORT_PAN_Y', message: `Viewport "${viewport.viewportId}" panY must be a finite number, got ${viewport.panY}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!viewport.visibleRegion || typeof viewport.visibleRegion.x !== 'number' || typeof viewport.visibleRegion.y !== 'number' || typeof viewport.visibleRegion.width !== 'number' || typeof viewport.visibleRegion.height !== 'number') {
    warnings.push({ code: 'INVALID_VISIBLE_REGION', message: `Viewport "${viewport.viewportId}" visibleRegion is invalid.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateRenderPipelineModel(
  pipeline: RenderPipelineModel,
  warnPrefix = '[CanvasRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!pipeline || typeof pipeline !== 'object') {
    warnings.push({ code: 'INVALID_PIPELINE', message: 'Render pipeline is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!pipeline.pipelineId) {
    warnings.push({ code: 'INVALID_PIPELINE_ID', message: 'Pipeline ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_PIPELINE_TYPES.includes(pipeline.pipelineType)) {
    warnings.push({ code: 'INVALID_PIPELINE_TYPE', message: `Pipeline "${pipeline.pipelineId}" has invalid pipelineType "${pipeline.pipelineType}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof pipeline.renderOrder !== 'number' || !Number.isInteger(pipeline.renderOrder)) {
    warnings.push({ code: 'INVALID_RENDER_ORDER', message: `Pipeline "${pipeline.pipelineId}" renderOrder must be an integer, got ${pipeline.renderOrder}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(pipeline.enabledLayers)) {
    warnings.push({ code: 'INVALID_ENABLED_LAYERS', message: `Pipeline "${pipeline.pipelineId}" enabledLayers is not an array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateDuplicateRenderNodeIds(
  nodes: RenderNodeModel[],
  warnPrefix = '[CanvasRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(nodes)) {
    warnings.push({ code: 'INVALID_NODES_ARRAY', message: 'Render nodes is not an array.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  const seen = new Set<string>();
  for (const node of nodes) {
    if (seen.has(node.renderNodeId)) {
      warnings.push({ code: 'DUPLICATE_RENDER_NODE_ID', message: `Duplicate render node ID "${node.renderNodeId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(node.renderNodeId);
  }
  return warnings;
}

export function validateDuplicateSceneGraphIds(
  graphs: SceneGraphModel[],
  warnPrefix = '[CanvasRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(graphs)) {
    warnings.push({ code: 'INVALID_GRAPHS_ARRAY', message: 'Scene graphs is not an array.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  const seen = new Set<string>();
  for (const graph of graphs) {
    if (seen.has(graph.sceneGraphId)) {
      warnings.push({ code: 'DUPLICATE_SCENE_GRAPH_ID', message: `Duplicate scene graph ID "${graph.sceneGraphId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(graph.sceneGraphId);
  }
  return warnings;
}

export function validateDuplicateViewportIds(
  viewports: ViewportModel[],
  warnPrefix = '[CanvasRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(viewports)) {
    warnings.push({ code: 'INVALID_VIEWPORTS_ARRAY', message: 'Viewports is not an array.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  const seen = new Set<string>();
  for (const vp of viewports) {
    if (seen.has(vp.viewportId)) {
      warnings.push({ code: 'DUPLICATE_VIEWPORT_ID', message: `Duplicate viewport ID "${vp.viewportId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(vp.viewportId);
  }
  return warnings;
}

export function validateDuplicatePipelineIds(
  pipelines: RenderPipelineModel[],
  warnPrefix = '[CanvasRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(pipelines)) {
    warnings.push({ code: 'INVALID_PIPELINES_ARRAY', message: 'Render pipelines is not an array.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  const seen = new Set<string>();
  for (const pipe of pipelines) {
    if (seen.has(pipe.pipelineId)) {
      warnings.push({ code: 'DUPLICATE_PIPELINE_ID', message: `Duplicate pipeline ID "${pipe.pipelineId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(pipe.pipelineId);
  }
  return warnings;
}

export function validateInvalidHierarchy(
  nodes: RenderNodeModel[],
  warnPrefix = '[CanvasRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(nodes)) return warnings;
  const nodeMap = new Map<string, RenderNodeModel>();
  for (const node of nodes) {
    nodeMap.set(node.renderNodeId, node);
  }
  for (const node of nodes) {
    if (node.parentNodeId && !nodeMap.has(node.parentNodeId)) {
      warnings.push({ code: 'INVALID_HIERARCHY', message: `Render node "${node.renderNodeId}" references missing parent "${node.parentNodeId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    for (const childId of node.childNodeIds) {
      if (!nodeMap.has(childId)) {
        warnings.push({ code: 'INVALID_HIERARCHY', message: `Render node "${node.renderNodeId}" references missing child "${childId}".` });
        console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
      }
    }
  }
  return warnings;
}

// ─── Canvas Render Synchronizer ───────────────────────────────────

export class CanvasRenderSynchronizer {
  private readonly renderNodeRegistry = new RenderRegistry<RenderNodeModel>();
  private readonly sceneGraphRegistry = new RenderRegistry<SceneGraphModel>();
  private readonly viewportRegistry = new RenderRegistry<ViewportModel>();
  private readonly pipelineRegistry = new RenderRegistry<RenderPipelineModel>();

  private readonly warnPrefix = '[CanvasRenderSynchronizer]';

  public get renderNodes(): RenderRegistry<RenderNodeModel> {
    return this.renderNodeRegistry;
  }

  public get sceneGraphs(): RenderRegistry<SceneGraphModel> {
    return this.sceneGraphRegistry;
  }

  public get viewports(): RenderRegistry<ViewportModel> {
    return this.viewportRegistry;
  }

  public get pipelines(): RenderRegistry<RenderPipelineModel> {
    return this.pipelineRegistry;
  }

  public buildSnapshot(
    renderNodes: RenderNodeModel[] = [],
    sceneGraphs: SceneGraphModel[] = [],
    viewports: ViewportModel[] = [],
    renderPipelines: RenderPipelineModel[] = [],
  ): CanvasRenderSnapshot {
    validateDuplicateRenderNodeIds(renderNodes, this.warnPrefix);
    validateDuplicateSceneGraphIds(sceneGraphs, this.warnPrefix);
    validateDuplicateViewportIds(viewports, this.warnPrefix);
    validateDuplicatePipelineIds(renderPipelines, this.warnPrefix);
    validateInvalidHierarchy(renderNodes, this.warnPrefix);

    for (const node of renderNodes) {
      validateRenderNodeModel(node, this.warnPrefix);
      this.renderNodeRegistry.register(node.renderNodeId, node, this.warnPrefix);
    }

    for (const graph of sceneGraphs) {
      validateSceneGraphModel(graph, this.warnPrefix);
      this.sceneGraphRegistry.register(graph.sceneGraphId, graph, this.warnPrefix);
    }

    for (const vp of viewports) {
      validateViewportModel(vp, this.warnPrefix);
      this.viewportRegistry.register(vp.viewportId, vp, this.warnPrefix);
    }

    for (const pipe of renderPipelines) {
      validateRenderPipelineModel(pipe, this.warnPrefix);
      this.pipelineRegistry.register(pipe.pipelineId, pipe, this.warnPrefix);
    }

    return {
      renderNodes: safeDeepCopy(renderNodes),
      sceneGraphs: safeDeepCopy(sceneGraphs),
      viewports: safeDeepCopy(viewports),
      renderPipelines: safeDeepCopy(renderPipelines),
    };
  }

  public clear(): void {
    this.renderNodeRegistry.clear();
    this.sceneGraphRegistry.clear();
    this.viewportRegistry.clear();
    this.pipelineRegistry.clear();
  }

  public clone(): CanvasRenderSynchronizer {
    const cloned = new CanvasRenderSynchronizer();
    cloned.renderNodeRegistry.fromJSON(this.renderNodeRegistry.getAll(), n => n.renderNodeId, this.warnPrefix);
    cloned.sceneGraphRegistry.fromJSON(this.sceneGraphRegistry.getAll(), g => g.sceneGraphId, this.warnPrefix);
    cloned.viewportRegistry.fromJSON(this.viewportRegistry.getAll(), v => v.viewportId, this.warnPrefix);
    cloned.pipelineRegistry.fromJSON(this.pipelineRegistry.getAll(), p => p.pipelineId, this.warnPrefix);
    return cloned;
  }

  public toJSON(): {
    renderNodes: RenderNodeModel[];
    sceneGraphs: SceneGraphModel[];
    viewports: ViewportModel[];
    renderPipelines: RenderPipelineModel[];
  } {
    return {
      renderNodes: this.renderNodeRegistry.getAll(),
      sceneGraphs: this.sceneGraphRegistry.getAll(),
      viewports: this.viewportRegistry.getAll(),
      renderPipelines: this.pipelineRegistry.getAll(),
    };
  }

  public fromJSON(data: {
    renderNodes?: RenderNodeModel[];
    sceneGraphs?: SceneGraphModel[];
    viewports?: ViewportModel[];
    renderPipelines?: RenderPipelineModel[];
  }): void {
    this.clear();
    if (Array.isArray(data.renderNodes)) {
      for (const node of data.renderNodes) {
        this.renderNodeRegistry.register(node.renderNodeId, node, this.warnPrefix);
      }
    }
    if (Array.isArray(data.sceneGraphs)) {
      for (const graph of data.sceneGraphs) {
        this.sceneGraphRegistry.register(graph.sceneGraphId, graph, this.warnPrefix);
      }
    }
    if (Array.isArray(data.viewports)) {
      for (const vp of data.viewports) {
        this.viewportRegistry.register(vp.viewportId, vp, this.warnPrefix);
      }
    }
    if (Array.isArray(data.renderPipelines)) {
      for (const pipe of data.renderPipelines) {
        this.pipelineRegistry.register(pipe.pipelineId, pipe, this.warnPrefix);
      }
    }
  }

  public sync(data: {
    renderNodes?: RenderNodeModel[];
    sceneGraphs?: SceneGraphModel[];
    viewports?: ViewportModel[];
    renderPipelines?: RenderPipelineModel[];
  }): void {
    this.fromJSON(data);
  }
}
