import {
  ElectricalNodeModel,
  ElectricalNetModel,
  ElectricalConnectionModel,
  BreadboardRailModel,
  BreadboardRowModel,
  ElectricalConnectivitySnapshot,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

// ─── FACTORY FUNCTIONS ────────────────────────────────────────────────────────

export function createDefaultElectricalNodeModel(
  nodeId = 'default_node',
  overrides: Partial<ElectricalNodeModel> = {},
): ElectricalNodeModel {
  return {
    nodeId,
    nodeType: overrides.nodeType || 'GPIO_PIN',
    componentId: overrides.componentId || '',
    pinId: overrides.pinId || '',
    voltage: overrides.voltage !== undefined ? overrides.voltage : 0,
    current: overrides.current !== undefined ? overrides.current : 0,
    logicState: overrides.logicState || 'FLOATING',
    metadata: overrides.metadata || {},
    ...overrides,
  };
}

export function createDefaultElectricalNetModel(
  netId = 'default_net',
  overrides: Partial<ElectricalNetModel> = {},
): ElectricalNetModel {
  return {
    netId,
    nodeIds: overrides.nodeIds || [],
    netState: overrides.netState || 'INACTIVE',
    metadata: overrides.metadata || {},
    ...overrides,
  };
}

export function createDefaultElectricalConnectionModel(
  connectionId = 'default_connection',
  overrides: Partial<ElectricalConnectionModel> = {},
): ElectricalConnectionModel {
  return {
    connectionId,
    sourceNodeId: overrides.sourceNodeId || '',
    targetNodeId: overrides.targetNodeId || '',
    connectionType: overrides.connectionType || 'WIRE',
    connectionState: overrides.connectionState || 'CONNECTED',
    ...overrides,
  };
}

export function createDefaultBreadboardRailModel(
  railId = 'default_rail',
  overrides: Partial<BreadboardRailModel> = {},
): BreadboardRailModel {
  return {
    railId,
    railType: overrides.railType || 'POWER',
    nodeIds: overrides.nodeIds || [],
    metadata: overrides.metadata || {},
    ...overrides,
  };
}

export function createDefaultBreadboardRowModel(
  rowId = 'default_row',
  overrides: Partial<BreadboardRowModel> = {},
): BreadboardRowModel {
  return {
    rowId,
    rowIndex: overrides.rowIndex !== undefined ? overrides.rowIndex : 0,
    columnIds: overrides.columnIds || [],
    nodeIds: overrides.nodeIds || [],
    metadata: overrides.metadata || {},
    ...overrides,
  };
}

// ─── MODEL VALIDATORS ─────────────────────────────────────────────────────────

export function validateElectricalNodeModel(
  model: ElectricalNodeModel,
  warnPrefix = '[ElectricalConnectivity]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_NODE_MODEL', message: 'Electrical node model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.nodeId) {
    warnings.push({ code: 'INVALID_NODE_ID', message: 'Electrical node ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.nodeType) {
    warnings.push({ code: 'INVALID_NODE_TYPE', message: `Electrical node "${model.nodeId}" has empty nodeType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.voltage !== 'number') {
    warnings.push({ code: 'INVALID_VOLTAGE', message: `Electrical node "${model.nodeId}" has invalid voltage.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.current !== 'number') {
    warnings.push({ code: 'INVALID_CURRENT', message: `Electrical node "${model.nodeId}" has invalid current.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.logicState !== 'string') {
    warnings.push({ code: 'INVALID_LOGIC_STATE', message: `Electrical node "${model.nodeId}" has invalid logicState.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.metadata !== 'object' || model.metadata === null || Array.isArray(model.metadata)) {
    warnings.push({ code: 'INVALID_METADATA', message: `Electrical node "${model.nodeId}" has invalid metadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateElectricalNetModel(
  model: ElectricalNetModel,
  warnPrefix = '[ElectricalConnectivity]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_NET_MODEL', message: 'Electrical net model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.netId) {
    warnings.push({ code: 'INVALID_NET_ID', message: 'Electrical net ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.nodeIds)) {
    warnings.push({ code: 'INVALID_NODE_IDS', message: `Electrical net "${model.netId}" has invalid nodeIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.netState !== 'string') {
    warnings.push({ code: 'INVALID_NET_STATE', message: `Electrical net "${model.netId}" has invalid netState.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.metadata !== 'object' || model.metadata === null || Array.isArray(model.metadata)) {
    warnings.push({ code: 'INVALID_METADATA', message: `Electrical net "${model.netId}" has invalid metadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateElectricalConnectionModel(
  model: ElectricalConnectionModel,
  warnPrefix = '[ElectricalConnectivity]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_CONNECTION_MODEL', message: 'Electrical connection model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.connectionId) {
    warnings.push({ code: 'INVALID_CONNECTION_ID', message: 'Electrical connection ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.sourceNodeId) {
    warnings.push({ code: 'INVALID_SOURCE_NODE_ID', message: `Electrical connection "${model.connectionId}" has empty sourceNodeId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.targetNodeId) {
    warnings.push({ code: 'INVALID_TARGET_NODE_ID', message: `Electrical connection "${model.connectionId}" has empty targetNodeId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.connectionType !== 'string') {
    warnings.push({ code: 'INVALID_CONNECTION_TYPE', message: `Electrical connection "${model.connectionId}" has invalid connectionType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.connectionState !== 'string') {
    warnings.push({ code: 'INVALID_CONNECTION_STATE', message: `Electrical connection "${model.connectionId}" has invalid connectionState.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateBreadboardRailModel(
  model: BreadboardRailModel,
  warnPrefix = '[ElectricalConnectivity]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_RAIL_MODEL', message: 'Breadboard rail model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.railId) {
    warnings.push({ code: 'INVALID_RAIL_ID', message: 'Breadboard rail ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.railType) {
    warnings.push({ code: 'INVALID_RAIL_TYPE', message: `Breadboard rail "${model.railId}" has empty railType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.nodeIds)) {
    warnings.push({ code: 'INVALID_NODE_IDS', message: `Breadboard rail "${model.railId}" has invalid nodeIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.metadata !== 'object' || model.metadata === null || Array.isArray(model.metadata)) {
    warnings.push({ code: 'INVALID_METADATA', message: `Breadboard rail "${model.railId}" has invalid metadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateBreadboardRowModel(
  model: BreadboardRowModel,
  warnPrefix = '[ElectricalConnectivity]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_ROW_MODEL', message: 'Breadboard row model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.rowId) {
    warnings.push({ code: 'INVALID_ROW_ID', message: 'Breadboard row ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.rowIndex !== 'number') {
    warnings.push({ code: 'INVALID_ROW_INDEX', message: `Breadboard row "${model.rowId}" has invalid rowIndex.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.columnIds)) {
    warnings.push({ code: 'INVALID_COLUMN_IDS', message: `Breadboard row "${model.rowId}" has invalid columnIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.nodeIds)) {
    warnings.push({ code: 'INVALID_NODE_IDS', message: `Breadboard row "${model.rowId}" has invalid nodeIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.metadata !== 'object' || model.metadata === null || Array.isArray(model.metadata)) {
    warnings.push({ code: 'INVALID_METADATA', message: `Breadboard row "${model.rowId}" has invalid metadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ─── DUPLICATE VALIDATORS ─────────────────────────────────────────────────────

export function validateDuplicateElectricalNodeIds(
  models: ElectricalNodeModel[],
  warnPrefix = '[ElectricalConnectivity]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.nodeId)) {
      warnings.push({ code: 'DUPLICATE_NODE_ID', message: `Duplicate electrical node ID "${model.nodeId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.nodeId);
  }
  return warnings;
}

export function validateDuplicateElectricalNetIds(
  models: ElectricalNetModel[],
  warnPrefix = '[ElectricalConnectivity]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.netId)) {
      warnings.push({ code: 'DUPLICATE_NET_ID', message: `Duplicate electrical net ID "${model.netId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.netId);
  }
  return warnings;
}

export function validateDuplicateElectricalConnectionIds(
  models: ElectricalConnectionModel[],
  warnPrefix = '[ElectricalConnectivity]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.connectionId)) {
      warnings.push({ code: 'DUPLICATE_CONNECTION_ID', message: `Duplicate electrical connection ID "${model.connectionId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.connectionId);
  }
  return warnings;
}

export function validateDuplicateBreadboardRailIds(
  models: BreadboardRailModel[],
  warnPrefix = '[ElectricalConnectivity]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.railId)) {
      warnings.push({ code: 'DUPLICATE_RAIL_ID', message: `Duplicate breadboard rail ID "${model.railId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.railId);
  }
  return warnings;
}

export function validateDuplicateBreadboardRowIds(
  models: BreadboardRowModel[],
  warnPrefix = '[ElectricalConnectivity]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.rowId)) {
      warnings.push({ code: 'DUPLICATE_ROW_ID', message: `Duplicate breadboard row ID "${model.rowId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.rowId);
  }
  return warnings;
}

// ─── CONNECTIVITY RUNTIME FUNCTIONS ───────────────────────────────────────────

export function connectNodes(
  connections: ElectricalConnectionModel[],
  sourceNodeId: string,
  targetNodeId: string,
  connectionId?: string,
): ElectricalConnectionModel {
  const id = connectionId || `conn_${sourceNodeId}_to_${targetNodeId}`;
  const existing = connections.find(c => c.connectionId === id);
  if (existing) {
    existing.connectionState = 'CONNECTED';
    return existing;
  }
  const newConn = createDefaultElectricalConnectionModel(id, {
    sourceNodeId,
    targetNodeId,
    connectionState: 'CONNECTED',
  });
  connections.push(newConn);
  return newConn;
}

export function disconnectNodes(
  connections: ElectricalConnectionModel[],
  sourceNodeId: string,
  targetNodeId: string,
): void {
  const index = connections.findIndex(
    c => (c.sourceNodeId === sourceNodeId && c.targetNodeId === targetNodeId) ||
         (c.sourceNodeId === targetNodeId && c.targetNodeId === sourceNodeId),
  );
  if (index !== -1) {
    connections.splice(index, 1);
  }
}

export function findConnectedNodes(
  nodeId: string,
  connections: ElectricalConnectionModel[],
): string[] {
  const connected: string[] = [];
  for (const conn of connections) {
    if (conn.connectionState === 'CONNECTED' || conn.connectionState === '') {
      if (conn.sourceNodeId === nodeId) {
        connected.push(conn.targetNodeId);
      } else if (conn.targetNodeId === nodeId) {
        connected.push(conn.sourceNodeId);
      }
    }
  }
  return connected;
}

export function findConnectedNet(
  startNodeId: string,
  nodes: ElectricalNodeModel[],
  connections: ElectricalConnectionModel[],
  rails: BreadboardRailModel[] = [],
  rows: BreadboardRowModel[] = [],
  nets: ElectricalNetModel[] = [],
): string[] {
  const visited = new Set<string>();
  const queue: string[] = [startNodeId];
  visited.add(startNodeId);

  while (queue.length > 0) {
    const current = queue.shift()!;

    // 1. Find direct wiring connections
    for (const conn of connections) {
      if (conn.connectionState === 'CONNECTED' || conn.connectionState === '') {
        if (conn.sourceNodeId === current && !visited.has(conn.targetNodeId)) {
          visited.add(conn.targetNodeId);
          queue.push(conn.targetNodeId);
        } else if (conn.targetNodeId === current && !visited.has(conn.sourceNodeId)) {
          visited.add(conn.sourceNodeId);
          queue.push(conn.sourceNodeId);
        }
      }
    }

    // 2. Find passive component internal connectivity (e.g. Resistors, Wires, Jumpers)
    const currentNode = nodes.find(n => n.nodeId === current);
    if (currentNode && currentNode.componentId) {
      const componentId = currentNode.componentId;
      const idLower = componentId.toLowerCase();
      if (idLower.includes('resistor') || idLower.includes('wire') || idLower.includes('jumper') || idLower.includes('passive')) {
        const siblingNodes = nodes.filter(n => n.componentId === componentId);
        for (const sib of siblingNodes) {
          if (!visited.has(sib.nodeId)) {
            visited.add(sib.nodeId);
            queue.push(sib.nodeId);
          }
        }
      }
    }

    // 3. Find breadboard rail memberships
    for (const rail of rails) {
      if (rail.nodeIds.includes(current)) {
        for (const nid of rail.nodeIds) {
          if (!visited.has(nid)) {
            visited.add(nid);
            queue.push(nid);
          }
        }
      }
    }

    // 4. Find breadboard row memberships
    for (const row of rows) {
      if (row.nodeIds.includes(current)) {
        for (const nid of row.nodeIds) {
          if (!visited.has(nid)) {
            visited.add(nid);
            queue.push(nid);
          }
        }
      }
    }

    // 5. Find net memberships
    for (const net of nets) {
      if (net.nodeIds.includes(current)) {
        for (const nid of net.nodeIds) {
          if (!visited.has(nid)) {
            visited.add(nid);
            queue.push(nid);
          }
        }
      }
    }
  }

  return Array.from(visited);
}

export function propagateLogicState(
  startNodeId: string,
  logicState: string,
  nodes: ElectricalNodeModel[],
  connections: ElectricalConnectionModel[],
  rails: BreadboardRailModel[] = [],
  rows: BreadboardRowModel[] = [],
  nets: ElectricalNetModel[] = [],
): void {
  const netNodeIds = findConnectedNet(startNodeId, nodes, connections, rails, rows, nets);
  for (const nid of netNodeIds) {
    const node = nodes.find(n => n.nodeId === nid);
    if (node) {
      node.logicState = logicState;
      if (logicState === 'HIGH') {
        node.voltage = 3.3;
      } else if (logicState === 'LOW') {
        node.voltage = 0;
      }
    }
  }
}

export function propagateVoltage(
  startNodeId: string,
  voltage: number,
  nodes: ElectricalNodeModel[],
  connections: ElectricalConnectionModel[],
  rails: BreadboardRailModel[] = [],
  rows: BreadboardRowModel[] = [],
  nets: ElectricalNetModel[] = [],
): void {
  const netNodeIds = findConnectedNet(startNodeId, nodes, connections, rails, rows, nets);
  for (const nid of netNodeIds) {
    const node = nodes.find(n => n.nodeId === nid);
    if (node) {
      node.voltage = voltage;
      if (voltage > 2.0) {
        node.logicState = 'HIGH';
      } else if (voltage < 0.8) {
        node.logicState = 'LOW';
      }
    }
  }
}

export function solveConnectivity(
  nodes: ElectricalNodeModel[],
  connections: ElectricalConnectionModel[],
  rails: BreadboardRailModel[] = [],
  rows: BreadboardRowModel[] = [],
  nets: ElectricalNetModel[] = [],
): void {
  // 1. Initialize all nodes to default low state unless they are explicit drivers
  for (const node of nodes) {
    const isGnd = node.pinId === 'GND' || node.nodeId.toLowerCase().includes('gnd') || node.nodeType === 'GROUND_RAIL';
    const isVcc = node.pinId === 'VCC' || node.nodeId.toLowerCase().includes('vcc') || node.nodeType === 'POWER_RAIL' || node.nodeId.toLowerCase().includes('3v3') || node.nodeId.toLowerCase().includes('5v');
    const isGpioOutput = node.nodeType === 'GPIO_PIN' && node.metadata.direction === 'OUTPUT';

    if (isGnd) {
      node.voltage = 0;
      node.logicState = 'LOW';
    } else if (isVcc) {
      node.voltage = 3.3;
      node.logicState = 'HIGH';
    } else if (!isGpioOutput) {
      node.voltage = 0;
      node.logicState = 'FLOATING';
    }
  }

  // 2. Propagate states from all driver nodes (GPIO Output nodes and VCC/GND nodes)
  const driverNodes = nodes.filter(node => {
    const isGnd = node.pinId === 'GND' || node.nodeId.toLowerCase().includes('gnd') || node.nodeType === 'GROUND_RAIL';
    const isVcc = node.pinId === 'VCC' || node.nodeId.toLowerCase().includes('vcc') || node.nodeType === 'POWER_RAIL' || node.nodeId.toLowerCase().includes('3v3') || node.nodeId.toLowerCase().includes('5v');
    const isGpioOutput = node.nodeType === 'GPIO_PIN' && node.metadata.direction === 'OUTPUT';
    return isGnd || isVcc || isGpioOutput;
  });

  for (const driver of driverNodes) {
    propagateVoltage(driver.nodeId, driver.voltage, nodes, connections, rails, rows, nets);
  }

  // 3. Resolve LED states
  const componentIds = new Set(nodes.map(n => n.componentId).filter(id => !!id));
  for (const compId of componentIds) {
    if (compId.toLowerCase().includes('led')) {
      const ledNodes = nodes.filter(n => n.componentId === compId);
      const anode = ledNodes.find(n => n.pinId === 'ANODE' || n.pinId === 'A');
      const cathode = ledNodes.find(n => n.pinId === 'CATHODE' || n.pinId === 'K');

      if (anode && cathode) {
        const vDiff = anode.voltage - cathode.voltage;
        if (vDiff >= 1.5) {
          // LED is ON! Calculate current and set brightness
          const current = parseFloat(((vDiff - 1.5) / 0.220).toFixed(2)); // series resistor 220 Ohm (voltage diff minus LED forward drop of 1.5V)
          anode.current = current;
          cathode.current = -current;
          
          anode.logicState = 'ON';
          cathode.logicState = 'ON';

          // Update component metadata on all nodes
          for (const node of ledNodes) {
            node.metadata.state = 'ON';
            node.metadata.current = current;
            node.metadata.brightness = Math.min(100, Math.round(current * 10)); // simple brightness metric
          }
        } else {
          anode.current = 0;
          cathode.current = 0;
          anode.logicState = 'OFF';
          cathode.logicState = 'OFF';

          for (const node of ledNodes) {
            node.metadata.state = 'OFF';
            node.metadata.current = 0;
            node.metadata.brightness = 0;
          }
        }
      }
    }
  }

  // 4. Resolve HC-SR04 ultrasonic sensor Trigger/Echo logic
  for (const compId of componentIds) {
    if (compId.toLowerCase().includes('sr04') || compId.toLowerCase().includes('ultrasonic') || compId.toLowerCase().includes('sonar')) {
      const sensorNodes = nodes.filter(n => n.componentId === compId);
      const trig = sensorNodes.find(n => n.pinId === 'TRIG');
      const echo = sensorNodes.find(n => n.pinId === 'ECHO');

      if (trig && echo) {
        if (trig.logicState === 'HIGH' || trig.voltage > 2.0) {
          // TRIG active: echo pin output set to HIGH, propagate it
          echo.voltage = 3.3;
          echo.logicState = 'HIGH';
          propagateVoltage(echo.nodeId, 3.3, nodes, connections, rails, rows, nets);
        } else {
          echo.voltage = 0;
          echo.logicState = 'LOW';
          propagateVoltage(echo.nodeId, 0, nodes, connections, rails, rows, nets);
        }
      }
    }
  }
}

// ─── SYNCHRONIZER CLASS ────────────────────────────────────────────────────────

export class ElectricalConnectivitySynchronizer {
  private readonly electricalNodeRegistry = new RenderRegistry<ElectricalNodeModel>();
  private readonly electricalNetRegistry = new RenderRegistry<ElectricalNetModel>();
  private readonly electricalConnectionRegistry = new RenderRegistry<ElectricalConnectionModel>();
  private readonly breadboardRailRegistry = new RenderRegistry<BreadboardRailModel>();
  private readonly breadboardRowRegistry = new RenderRegistry<BreadboardRowModel>();

  private readonly warnPrefix = '[ElectricalConnectivitySynchronizer]';

  public get electricalNodes(): RenderRegistry<ElectricalNodeModel> {
    return this.electricalNodeRegistry;
  }

  public get electricalNets(): RenderRegistry<ElectricalNetModel> {
    return this.electricalNetRegistry;
  }

  public get electricalConnections(): RenderRegistry<ElectricalConnectionModel> {
    return this.electricalConnectionRegistry;
  }

  public get breadboardRails(): RenderRegistry<BreadboardRailModel> {
    return this.breadboardRailRegistry;
  }

  public get breadboardRows(): RenderRegistry<BreadboardRowModel> {
    return this.breadboardRowRegistry;
  }

  public buildSnapshot(
    electricalNodes: ElectricalNodeModel[] = [],
    electricalNets: ElectricalNetModel[] = [],
    electricalConnections: ElectricalConnectionModel[] = [],
    breadboardRails: BreadboardRailModel[] = [],
    breadboardRows: BreadboardRowModel[] = [],
  ): ElectricalConnectivitySnapshot {
    validateDuplicateElectricalNodeIds(electricalNodes, this.warnPrefix);
    validateDuplicateElectricalNetIds(electricalNets, this.warnPrefix);
    validateDuplicateElectricalConnectionIds(electricalConnections, this.warnPrefix);
    validateDuplicateBreadboardRailIds(breadboardRails, this.warnPrefix);
    validateDuplicateBreadboardRowIds(breadboardRows, this.warnPrefix);

    for (const m of electricalNodes) {
      validateElectricalNodeModel(m, this.warnPrefix);
      this.electricalNodeRegistry.register(m.nodeId, m, this.warnPrefix);
    }
    for (const m of electricalNets) {
      validateElectricalNetModel(m, this.warnPrefix);
      this.electricalNetRegistry.register(m.netId, m, this.warnPrefix);
    }
    for (const m of electricalConnections) {
      validateElectricalConnectionModel(m, this.warnPrefix);
      this.electricalConnectionRegistry.register(m.connectionId, m, this.warnPrefix);
    }
    for (const m of breadboardRails) {
      validateBreadboardRailModel(m, this.warnPrefix);
      this.breadboardRailRegistry.register(m.railId, m, this.warnPrefix);
    }
    for (const m of breadboardRows) {
      validateBreadboardRowModel(m, this.warnPrefix);
      this.breadboardRowRegistry.register(m.rowId, m, this.warnPrefix);
    }

    return this.clone();
  }

  public clear(): void {
    this.electricalNodeRegistry.clear();
    this.electricalNetRegistry.clear();
    this.electricalConnectionRegistry.clear();
    this.breadboardRailRegistry.clear();
    this.breadboardRowRegistry.clear();
  }

  public clone(): ElectricalConnectivitySnapshot {
    return {
      electricalNodes: safeDeepCopy(this.electricalNodeRegistry.getAll()),
      electricalNets: safeDeepCopy(this.electricalNetRegistry.getAll()),
      electricalConnections: safeDeepCopy(this.electricalConnectionRegistry.getAll()),
      breadboardRails: safeDeepCopy(this.breadboardRailRegistry.getAll()),
      breadboardRows: safeDeepCopy(this.breadboardRowRegistry.getAll()),
    };
  }

  public toJSON(): string {
    return JSON.stringify(this.clone());
  }

  public fromJSON(json: string): void {
    try {
      const data = JSON.parse(json) as Partial<ElectricalConnectivitySnapshot>;
      this.clear();
      if (data) {
        this.buildSnapshot(
          data.electricalNodes || [],
          data.electricalNets || [],
          data.electricalConnections || [],
          data.breadboardRails || [],
          data.breadboardRows || [],
        );
      }
    } catch (err: any) {
      console.warn(`${this.warnPrefix} failed to parse JSON snapshot: ${err.message}`);
    }
  }

  public sync(snapshot: ElectricalConnectivitySnapshot): void {
    this.clear();
    if (snapshot) {
      this.buildSnapshot(
        snapshot.electricalNodes || [],
        snapshot.electricalNets || [],
        snapshot.electricalConnections || [],
        snapshot.breadboardRails || [],
        snapshot.breadboardRows || [],
      );
    }
  }
}
