// ═══════════════════════════════════════════════════════════════
// Phase 28B: Circuit Graph Engine + Live Circuit Analyzer
// Builds and maintains the graph representation of circuit topology.
// Uses union-find to build electrical nets from component pins + wires.
// ═══════════════════════════════════════════════════════════════

import type {
  CircuitNodeModel, CircuitNodeType,
  CircuitEdgeModel, CircuitEdgeType,
  CircuitNetModel, CircuitNetState,
  CircuitGraphModel,
  CircuitMappingModel,
  CircuitGraphSnapshot,
  ProjectHealthModel,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

// ─── Deep Copy Helper ───────────────────────────────────────────

function safeDeepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const VALID_CIRCUIT_NODE_TYPES: CircuitNodeType[] = [
  'COMPONENT_PIN', 'BREADBOARD_HOLE', 'POWER_RAIL', 'GROUND_RAIL', 'BOARD_PIN',
];

export const VALID_CIRCUIT_EDGE_TYPES: CircuitEdgeType[] = [
  'WIRE', 'BREADBOARD_ROW', 'BREADBOARD_RAIL', 'INTERNAL', 'VIRTUAL',
];

export const VALID_CIRCUIT_NET_STATES: CircuitNetState[] = [
  'ACTIVE', 'INACTIVE', 'FLOATING', 'CONFLICT', 'SHORT_CIRCUIT',
];

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createDefaultCircuitNodeModel(
  id: string,
  overrides: Partial<CircuitNodeModel> = {},
): CircuitNodeModel {
  return {
    nodeType: 'COMPONENT_PIN',
    componentId: '',
    pinName: '',
    gpioNumber: -1,
    voltage: 0,
    netId: '',
    positionX: 0,
    positionY: 0,
    futureCircuitNodeHints: {},
    ...overrides,
    nodeId: id,
  };
}

export function createDefaultCircuitEdgeModel(
  id: string,
  overrides: Partial<CircuitEdgeModel> = {},
): CircuitEdgeModel {
  return {
    sourceNodeId: '',
    targetNodeId: '',
    edgeType: 'WIRE',
    wireId: '',
    resistance: 0,
    futureCircuitEdgeHints: {},
    ...overrides,
    edgeId: id,
  };
}

export function createDefaultCircuitNetModel(
  id: string,
  overrides: Partial<CircuitNetModel> = {},
): CircuitNetModel {
  return {
    nodeIds: [],
    netState: 'INACTIVE',
    netVoltage: 0,
    isPowerNet: false,
    isGroundNet: false,
    netLabel: '',
    futureCircuitNetHints: {},
    ...overrides,
    netId: id,
  };
}

export function createDefaultCircuitGraphModel(
  id: string,
  overrides: Partial<CircuitGraphModel> = {},
): CircuitGraphModel {
  return {
    nodes: [],
    edges: [],
    nets: [],
    componentIds: [],
    wireIds: [],
    breadboardIds: [],
    boardId: '',
    version: 0,
    futureCircuitGraphHints: {},
    ...overrides,
    graphId: id,
  };
}

export function createDefaultCircuitMappingModel(
  id: string,
  overrides: Partial<CircuitMappingModel> = {},
): CircuitMappingModel {
  return {
    graphId: '',
    componentId: '',
    componentType: '',
    pinName: '',
    gpioNumber: -1,
    blocklyBlockId: '',
    signalType: '',
    futureCircuitMappingHints: {},
    ...overrides,
    mappingId: id,
  };
}

export function createDefaultProjectHealthModel(
  id: string,
  overrides: Partial<ProjectHealthModel> = {},
): ProjectHealthModel {
  return {
    readinessPercent: 0,
    errorCount: 0,
    warningCount: 0,
    disconnectedComponents: [],
    unmappedGpios: [],
    unusedComponents: [],
    totalComponents: 0,
    totalWires: 0,
    totalNets: 0,
    healthGrade: 'F',
    futureProjectHealthHints: {},
    ...overrides,
    healthId: id,
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateCircuitNodeModel(
  model: CircuitNodeModel,
  warnPrefix = '[CircuitGraph]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_CIRCUIT_NODE', message: 'Circuit node model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.nodeId) {
    warnings.push({ code: 'EMPTY_NODE_ID', message: 'Circuit node ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_CIRCUIT_NODE_TYPES.includes(model.nodeType)) {
    warnings.push({ code: 'INVALID_NODE_TYPE', message: `Circuit node "${model.nodeId}" has invalid nodeType "${model.nodeType}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.voltage !== 'number') {
    warnings.push({ code: 'INVALID_VOLTAGE', message: `Circuit node "${model.nodeId}" has invalid voltage.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateCircuitEdgeModel(
  model: CircuitEdgeModel,
  warnPrefix = '[CircuitGraph]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_CIRCUIT_EDGE', message: 'Circuit edge model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.edgeId) {
    warnings.push({ code: 'EMPTY_EDGE_ID', message: 'Circuit edge ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.sourceNodeId) {
    warnings.push({ code: 'EMPTY_SOURCE', message: `Circuit edge "${model.edgeId}" has empty sourceNodeId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.targetNodeId) {
    warnings.push({ code: 'EMPTY_TARGET', message: `Circuit edge "${model.edgeId}" has empty targetNodeId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_CIRCUIT_EDGE_TYPES.includes(model.edgeType)) {
    warnings.push({ code: 'INVALID_EDGE_TYPE', message: `Circuit edge "${model.edgeId}" has invalid edgeType "${model.edgeType}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateCircuitNetModel(
  model: CircuitNetModel,
  warnPrefix = '[CircuitGraph]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_CIRCUIT_NET', message: 'Circuit net model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.netId) {
    warnings.push({ code: 'EMPTY_NET_ID', message: 'Circuit net ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.nodeIds)) {
    warnings.push({ code: 'INVALID_NODE_IDS', message: `Circuit net "${model.netId}" has invalid nodeIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_CIRCUIT_NET_STATES.includes(model.netState)) {
    warnings.push({ code: 'INVALID_NET_STATE', message: `Circuit net "${model.netId}" has invalid netState "${model.netState}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateCircuitGraphModel(
  model: CircuitGraphModel,
  warnPrefix = '[CircuitGraph]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_CIRCUIT_GRAPH', message: 'Circuit graph model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.graphId) {
    warnings.push({ code: 'EMPTY_GRAPH_ID', message: 'Circuit graph ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.nodes)) {
    warnings.push({ code: 'INVALID_NODES', message: `Circuit graph "${model.graphId}" has invalid nodes array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.edges)) {
    warnings.push({ code: 'INVALID_EDGES', message: `Circuit graph "${model.graphId}" has invalid edges array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.nets)) {
    warnings.push({ code: 'INVALID_NETS', message: `Circuit graph "${model.graphId}" has invalid nets array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateCircuitMappingModel(
  model: CircuitMappingModel,
  warnPrefix = '[CircuitGraph]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_MAPPING', message: 'Circuit mapping model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.mappingId) {
    warnings.push({ code: 'EMPTY_MAPPING_ID', message: 'Circuit mapping ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.componentId) {
    warnings.push({ code: 'EMPTY_COMPONENT_ID', message: `Circuit mapping "${model.mappingId}" has empty componentId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (model.gpioNumber < -1) {
    warnings.push({ code: 'INVALID_GPIO', message: `Circuit mapping "${model.mappingId}" has invalid gpioNumber ${model.gpioNumber}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// UNION-FIND HELPER (for building nets)
// ═══════════════════════════════════════════════════════════════

class UnionFind {
  private parent: Map<string, string> = new Map();
  private rank: Map<string, number> = new Map();

  public makeSet(x: string): void {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }
  }

  public find(x: string): string {
    if (!this.parent.has(x)) {
      this.makeSet(x);
    }
    let root = x;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root)!;
    }
    // Path compression
    let current = x;
    while (current !== root) {
      const next = this.parent.get(current)!;
      this.parent.set(current, root);
      current = next;
    }
    return root;
  }

  public union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return;
    const rankA = this.rank.get(rootA) || 0;
    const rankB = this.rank.get(rootB) || 0;
    if (rankA < rankB) {
      this.parent.set(rootA, rootB);
    } else if (rankA > rankB) {
      this.parent.set(rootB, rootA);
    } else {
      this.parent.set(rootB, rootA);
      this.rank.set(rootA, rankA + 1);
    }
  }

  public getGroups(): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    for (const key of this.parent.keys()) {
      const root = this.find(key);
      if (!groups.has(root)) {
        groups.set(root, []);
      }
      groups.get(root)!.push(key);
    }
    return groups;
  }
}

// ═══════════════════════════════════════════════════════════════
// SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

export interface CircuitGraphBuildParams {
  componentIds: string[];
  componentTypes: Map<string, string>;
  componentPins: Map<string, Array<{ pinName: string; gpioNumber: number; signalType: string }>>;
  wireConnections: Array<{ wireId: string; sourceNodeId: string; targetNodeId: string }>;
  boardId: string;
}

export class CircuitGraphSynchronizer {
  private readonly nodeRegistry = new RenderRegistry<CircuitNodeModel>();
  private readonly edgeRegistry = new RenderRegistry<CircuitEdgeModel>();
  private readonly netRegistry = new RenderRegistry<CircuitNetModel>();
  private readonly graphRegistry = new RenderRegistry<CircuitGraphModel>();
  private readonly mappingRegistry = new RenderRegistry<CircuitMappingModel>();
  private graphVersionCounter = 0;

  // ─── Node CRUD ──────────────────────────────────────────────

  public registerCircuitNode(model: CircuitNodeModel): void {
    this.nodeRegistry.register(model.nodeId, safeDeepCopy(model), '[CircuitGraph]');
  }
  public getCircuitNode(id: string): CircuitNodeModel | undefined {
    return this.nodeRegistry.lookup(id);
  }
  public getAllCircuitNodes(): CircuitNodeModel[] {
    return this.nodeRegistry.getAll();
  }
  public updateCircuitNode(id: string, updates: Partial<CircuitNodeModel>): void {
    this.nodeRegistry.update(id, updates, '[CircuitGraph]');
  }
  public removeCircuitNode(id: string): void {
    this.nodeRegistry.remove(id);
  }
  public clearCircuitNodes(): void {
    this.nodeRegistry.clear();
  }
  public getCircuitNodeKeys(): string[] {
    return this.nodeRegistry.keys();
  }
  public hasCircuitNode(id: string): boolean {
    return this.nodeRegistry.has(id);
  }

  // ─── Edge CRUD ──────────────────────────────────────────────

  public registerCircuitEdge(model: CircuitEdgeModel): void {
    this.edgeRegistry.register(model.edgeId, safeDeepCopy(model), '[CircuitGraph]');
  }
  public getCircuitEdge(id: string): CircuitEdgeModel | undefined {
    return this.edgeRegistry.lookup(id);
  }
  public getAllCircuitEdges(): CircuitEdgeModel[] {
    return this.edgeRegistry.getAll();
  }
  public updateCircuitEdge(id: string, updates: Partial<CircuitEdgeModel>): void {
    this.edgeRegistry.update(id, updates, '[CircuitGraph]');
  }
  public removeCircuitEdge(id: string): void {
    this.edgeRegistry.remove(id);
  }
  public clearCircuitEdges(): void {
    this.edgeRegistry.clear();
  }
  public getCircuitEdgeKeys(): string[] {
    return this.edgeRegistry.keys();
  }
  public hasCircuitEdge(id: string): boolean {
    return this.edgeRegistry.has(id);
  }

  // ─── Net CRUD ───────────────────────────────────────────────

  public registerCircuitNet(model: CircuitNetModel): void {
    this.netRegistry.register(model.netId, safeDeepCopy(model), '[CircuitGraph]');
  }
  public getCircuitNet(id: string): CircuitNetModel | undefined {
    return this.netRegistry.lookup(id);
  }
  public getAllCircuitNets(): CircuitNetModel[] {
    return this.netRegistry.getAll();
  }
  public updateCircuitNet(id: string, updates: Partial<CircuitNetModel>): void {
    this.netRegistry.update(id, updates, '[CircuitGraph]');
  }
  public removeCircuitNet(id: string): void {
    this.netRegistry.remove(id);
  }
  public clearCircuitNets(): void {
    this.netRegistry.clear();
  }
  public getCircuitNetKeys(): string[] {
    return this.netRegistry.keys();
  }
  public hasCircuitNet(id: string): boolean {
    return this.netRegistry.has(id);
  }

  // ─── Graph CRUD ─────────────────────────────────────────────

  public registerCircuitGraph(model: CircuitGraphModel): void {
    this.graphRegistry.register(model.graphId, safeDeepCopy(model), '[CircuitGraph]');
  }
  public getCircuitGraph(id: string): CircuitGraphModel | undefined {
    return this.graphRegistry.lookup(id);
  }
  public getAllCircuitGraphs(): CircuitGraphModel[] {
    return this.graphRegistry.getAll();
  }
  public updateCircuitGraph(id: string, updates: Partial<CircuitGraphModel>): void {
    this.graphRegistry.update(id, updates, '[CircuitGraph]');
  }
  public removeCircuitGraph(id: string): void {
    this.graphRegistry.remove(id);
  }
  public clearCircuitGraphs(): void {
    this.graphRegistry.clear();
  }
  public getCircuitGraphKeys(): string[] {
    return this.graphRegistry.keys();
  }
  public hasCircuitGraph(id: string): boolean {
    return this.graphRegistry.has(id);
  }

  // ─── Mapping CRUD ───────────────────────────────────────────

  public registerCircuitMapping(model: CircuitMappingModel): void {
    this.mappingRegistry.register(model.mappingId, safeDeepCopy(model), '[CircuitGraph]');
  }
  public getCircuitMapping(id: string): CircuitMappingModel | undefined {
    return this.mappingRegistry.lookup(id);
  }
  public getAllCircuitMappings(): CircuitMappingModel[] {
    return this.mappingRegistry.getAll();
  }
  public updateCircuitMapping(id: string, updates: Partial<CircuitMappingModel>): void {
    this.mappingRegistry.update(id, updates, '[CircuitGraph]');
  }
  public removeCircuitMapping(id: string): void {
    this.mappingRegistry.remove(id);
  }
  public clearCircuitMappings(): void {
    this.mappingRegistry.clear();
  }
  public getCircuitMappingKeys(): string[] {
    return this.mappingRegistry.keys();
  }
  public hasCircuitMapping(id: string): boolean {
    return this.mappingRegistry.has(id);
  }

  // ═══════════════════════════════════════════════════════════════
  // GRAPH BUILDING
  // ═══════════════════════════════════════════════════════════════

  public buildCircuitGraph(params: CircuitGraphBuildParams): CircuitGraphModel {
    const graphId = `graph_${++this.graphVersionCounter}`;
    const uf = new UnionFind();
    const allNodes: CircuitNodeModel[] = [];
    const allEdges: CircuitEdgeModel[] = [];

    // Step 1: Create nodes from component pins
    for (const compId of params.componentIds) {
      const pins = params.componentPins.get(compId) || [];
      const compType = params.componentTypes.get(compId) || '';
      for (const pin of pins) {
        const nodeId = `${compId}_${pin.pinName}`;
        const node = createDefaultCircuitNodeModel(nodeId, {
          nodeType: 'COMPONENT_PIN',
          componentId: compId,
          pinName: pin.pinName,
          gpioNumber: pin.gpioNumber,
        });
        allNodes.push(node);
        this.registerCircuitNode(node);
        uf.makeSet(nodeId);

        // Auto-create mapping
        const mappingId = `map_${compId}_${pin.pinName}`;
        this.registerCircuitMapping(createDefaultCircuitMappingModel(mappingId, {
          graphId,
          componentId: compId,
          componentType: compType,
          pinName: pin.pinName,
          gpioNumber: pin.gpioNumber,
          signalType: pin.signalType,
        }));
      }
    }

    // Step 2: Create edges from wire connections
    const wireIds: string[] = [];
    for (const wire of params.wireConnections) {
      const edge = createDefaultCircuitEdgeModel(wire.wireId, {
        sourceNodeId: wire.sourceNodeId,
        targetNodeId: wire.targetNodeId,
        edgeType: 'WIRE',
        wireId: wire.wireId,
      });
      allEdges.push(edge);
      this.registerCircuitEdge(edge);
      wireIds.push(wire.wireId);

      // Union the connected nodes
      uf.makeSet(wire.sourceNodeId);
      uf.makeSet(wire.targetNodeId);
      uf.union(wire.sourceNodeId, wire.targetNodeId);
    }

    // Step 3: Build nets from union-find groups
    const groups = uf.getGroups();
    const allNets: CircuitNetModel[] = [];
    let netIndex = 0;

    for (const [_root, nodeIds] of groups) {
      const netId = `net_${graphId}_${netIndex++}`;
      const hasPower = nodeIds.some(nId => {
        const n = this.getCircuitNode(nId);
        return n && (n.nodeType === 'POWER_RAIL' || n.pinName.toUpperCase().includes('VCC') || n.pinName.toUpperCase().includes('5V') || n.pinName.toUpperCase().includes('3V3'));
      });
      const hasGround = nodeIds.some(nId => {
        const n = this.getCircuitNode(nId);
        return n && (n.nodeType === 'GROUND_RAIL' || n.pinName.toUpperCase().includes('GND'));
      });

      let netState: CircuitNetState = 'INACTIVE';
      if (hasPower && hasGround) {
        netState = 'SHORT_CIRCUIT';
      } else if (hasPower) {
        netState = 'ACTIVE';
      } else if (hasGround) {
        netState = 'ACTIVE';
      } else if (nodeIds.length === 1) {
        netState = 'FLOATING';
      }

      const net = createDefaultCircuitNetModel(netId, {
        nodeIds: [...nodeIds],
        netState,
        netVoltage: hasPower ? 3.3 : 0,
        isPowerNet: hasPower,
        isGroundNet: hasGround,
        netLabel: hasPower ? 'POWER' : hasGround ? 'GND' : `NET_${netIndex - 1}`,
      });
      allNets.push(net);
      this.registerCircuitNet(net);

      // Update nodes with their net assignment
      for (const nId of nodeIds) {
        this.updateCircuitNode(nId, { netId });
      }
    }

    // Step 4: Create and register graph
    const graph = createDefaultCircuitGraphModel(graphId, {
      nodes: safeDeepCopy(allNodes),
      edges: safeDeepCopy(allEdges),
      nets: safeDeepCopy(allNets),
      componentIds: [...params.componentIds],
      wireIds,
      boardId: params.boardId,
      version: this.graphVersionCounter,
    });
    this.registerCircuitGraph(graph);

    return safeDeepCopy(graph);
  }

  public validateCircuitGraphById(graphId: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const graph = this.getCircuitGraph(graphId);
    if (!graph) {
      warnings.push({ code: 'GRAPH_NOT_FOUND', message: `Circuit graph "${graphId}" not found.` });
      console.warn(`[CircuitGraph] ${warnings[warnings.length - 1].message}`);
      return warnings;
    }

    // Check for floating pins (nodes in nets with only 1 member)
    for (const net of graph.nets) {
      if (net.nodeIds.length === 1 && net.netState === 'FLOATING') {
        warnings.push({ code: 'FLOATING_PIN', message: `Pin "${net.nodeIds[0]}" is floating (unconnected).` });
        console.warn(`[CircuitGraph] ${warnings[warnings.length - 1].message}`);
      }
    }

    // Check for missing ground
    const hasGround = graph.nets.some(n => n.isGroundNet);
    if (!hasGround && graph.componentIds.length > 0) {
      warnings.push({ code: 'MISSING_GROUND', message: 'Circuit has no ground connection.' });
      console.warn(`[CircuitGraph] ${warnings[warnings.length - 1].message}`);
    }

    // Check for missing power
    const hasPower = graph.nets.some(n => n.isPowerNet);
    if (!hasPower && graph.componentIds.length > 0) {
      warnings.push({ code: 'MISSING_POWER', message: 'Circuit has no power connection.' });
      console.warn(`[CircuitGraph] ${warnings[warnings.length - 1].message}`);
    }

    // Check for short circuits
    for (const net of graph.nets) {
      if (net.netState === 'SHORT_CIRCUIT') {
        warnings.push({ code: 'SHORT_CIRCUIT', message: `Net "${net.netId}" has a short circuit (power and ground connected).` });
        console.warn(`[CircuitGraph] ${warnings[warnings.length - 1].message}`);
      }
    }

    // Check for disconnected components
    const connectedComponents = new Set<string>();
    for (const net of graph.nets) {
      if (net.nodeIds.length > 1) {
        for (const nodeId of net.nodeIds) {
          const node = this.getCircuitNode(nodeId);
          if (node && node.componentId) {
            connectedComponents.add(node.componentId);
          }
        }
      }
    }
    for (const compId of graph.componentIds) {
      if (!connectedComponents.has(compId)) {
        warnings.push({ code: 'DISCONNECTED_COMPONENT', message: `Component "${compId}" is not connected to any other component.` });
        console.warn(`[CircuitGraph] ${warnings[warnings.length - 1].message}`);
      }
    }

    return warnings;
  }

  public rebuildCircuitGraph(params: CircuitGraphBuildParams): CircuitGraphModel {
    this.clearCircuitNodes();
    this.clearCircuitEdges();
    this.clearCircuitNets();
    this.clearCircuitMappings();
    return this.buildCircuitGraph(params);
  }

  public exportCircuitGraph(graphId: string): string {
    const graph = this.getCircuitGraph(graphId);
    if (!graph) {
      console.warn(`[CircuitGraph] Cannot export: graph "${graphId}" not found.`);
      return '{}';
    }
    return JSON.stringify(safeDeepCopy(graph));
  }

  public importCircuitGraph(json: string): CircuitGraphModel | null {
    try {
      const graph = JSON.parse(json) as CircuitGraphModel;
      if (!graph || !graph.graphId) {
        console.warn('[CircuitGraph] Import failed: invalid graph data.');
        return null;
      }
      this.registerCircuitGraph(graph);
      for (const node of graph.nodes || []) {
        this.registerCircuitNode(node);
      }
      for (const edge of graph.edges || []) {
        this.registerCircuitEdge(edge);
      }
      for (const net of graph.nets || []) {
        this.registerCircuitNet(net);
      }
      return safeDeepCopy(graph);
    } catch {
      console.warn('[CircuitGraph] Import failed: invalid JSON.');
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // LIVE ANALYZER
  // ═══════════════════════════════════════════════════════════════

  public onComponentPlaced(
    componentId: string,
    componentType: string,
    pins: Array<{ pinName: string; gpioNumber: number; signalType: string }>,
  ): void {
    for (const pin of pins) {
      const nodeId = `${componentId}_${pin.pinName}`;
      this.registerCircuitNode(createDefaultCircuitNodeModel(nodeId, {
        nodeType: 'COMPONENT_PIN',
        componentId,
        pinName: pin.pinName,
        gpioNumber: pin.gpioNumber,
      }));
    }
  }

  public onComponentRemoved(componentId: string): void {
    // Remove all nodes belonging to this component
    const nodeKeys = this.getCircuitNodeKeys();
    for (const key of nodeKeys) {
      const node = this.getCircuitNode(key);
      if (node && node.componentId === componentId) {
        this.removeCircuitNode(key);
      }
    }
    // Remove all edges connecting to removed nodes
    const edgeKeys = this.getCircuitEdgeKeys();
    for (const key of edgeKeys) {
      const edge = this.getCircuitEdge(key);
      if (edge) {
        const srcNode = this.getCircuitNode(edge.sourceNodeId);
        const tgtNode = this.getCircuitNode(edge.targetNodeId);
        if (!srcNode || !tgtNode) {
          this.removeCircuitEdge(key);
        }
      }
    }
    // Remove mappings for this component
    const mappingKeys = this.getCircuitMappingKeys();
    for (const key of mappingKeys) {
      const mapping = this.getCircuitMapping(key);
      if (mapping && mapping.componentId === componentId) {
        this.removeCircuitMapping(key);
      }
    }
  }

  public onWireAdded(wireId: string, sourceNodeId: string, targetNodeId: string): void {
    this.registerCircuitEdge(createDefaultCircuitEdgeModel(wireId, {
      sourceNodeId,
      targetNodeId,
      edgeType: 'WIRE',
      wireId,
    }));
  }

  public onWireRemoved(wireId: string): void {
    this.removeCircuitEdge(wireId);
  }

  // ═══════════════════════════════════════════════════════════════
  // PROJECT HEALTH
  // ═══════════════════════════════════════════════════════════════

  public calculateProjectHealth(
    graphId: string,
    mappedGpios: number[],
    programExists: boolean,
  ): ProjectHealthModel {
    const graph = this.getCircuitGraph(graphId);
    const healthId = `health_${graphId}`;

    if (!graph) {
      return createDefaultProjectHealthModel(healthId);
    }

    const warnings = this.validateCircuitGraphById(graphId);
    const errorCount = warnings.filter(w =>
      w.code === 'SHORT_CIRCUIT',
    ).length;
    const warningCount = warnings.length - errorCount;

    const disconnectedComponents = warnings
      .filter(w => w.code === 'DISCONNECTED_COMPONENT')
      .map(w => {
        const match = w.message.match(/Component "(.+?)"/);
        return match ? match[1] : '';
      })
      .filter(Boolean);

    // Find unmapped GPIOs
    const allGpios = new Set<number>();
    for (const node of graph.nodes) {
      if (node.gpioNumber >= 0) {
        allGpios.add(node.gpioNumber);
      }
    }
    const unmappedGpios = [...allGpios].filter(g => !mappedGpios.includes(g));

    // Find unused components (disconnected)
    const unusedComponents = [...disconnectedComponents];

    // Calculate readiness
    let readiness = 0;
    const totalComponents = graph.componentIds.length;
    const totalWires = graph.wireIds.length;
    const totalNets = graph.nets.length;

    if (totalComponents > 0) readiness += 20;
    if (totalWires > 0) readiness += 20;
    if (errorCount === 0) readiness += 20;
    if (disconnectedComponents.length === 0 && totalComponents > 0) readiness += 20;
    if (programExists) readiness += 20;

    let healthGrade = 'F';
    if (readiness >= 90) healthGrade = 'A';
    else if (readiness >= 70) healthGrade = 'B';
    else if (readiness >= 50) healthGrade = 'C';
    else if (readiness >= 30) healthGrade = 'D';

    return createDefaultProjectHealthModel(healthId, {
      readinessPercent: readiness,
      errorCount,
      warningCount,
      disconnectedComponents,
      unmappedGpios,
      unusedComponents,
      totalComponents,
      totalWires,
      totalNets,
      healthGrade,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // SNAPSHOT & LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  public getSnapshot(): CircuitGraphSnapshot {
    return {
      nodes: this.getAllCircuitNodes(),
      edges: this.getAllCircuitEdges(),
      nets: this.getAllCircuitNets(),
      graphs: this.getAllCircuitGraphs(),
      mappings: this.getAllCircuitMappings(),
    };
  }

  public clearAll(): void {
    this.clearCircuitNodes();
    this.clearCircuitEdges();
    this.clearCircuitNets();
    this.clearCircuitGraphs();
    this.clearCircuitMappings();
    this.graphVersionCounter = 0;
  }
}
