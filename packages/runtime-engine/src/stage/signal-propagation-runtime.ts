import {
  SignalPacketModel,
  SignalPropagationRuntimeModel,
  PropagationPathModel,
  TimingModel,
  SignalPropagationSnapshot,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

// ─── FACTORY FUNCTIONS ────────────────────────────────────────────────────────

export function createDefaultSignalPacket(
  packetId = 'default_packet',
  overrides: Partial<SignalPacketModel> = {},
): SignalPacketModel {
  return {
    packetId,
    sourceNodeId: overrides.sourceNodeId || '',
    targetNodeId: overrides.targetNodeId || '',
    logicState: overrides.logicState || 'FLOATING',
    voltage: overrides.voltage !== undefined ? overrides.voltage : 0,
    timestamp: overrides.timestamp !== undefined ? overrides.timestamp : 0,
    metadata: overrides.metadata || {},
    ...overrides,
  };
}

export function createDefaultPropagationPath(
  pathId = 'default_path',
  overrides: Partial<PropagationPathModel> = {},
): PropagationPathModel {
  return {
    pathId,
    nodeIds: overrides.nodeIds || [],
    pathLength: overrides.pathLength !== undefined ? overrides.pathLength : 1,
    propagationDelay: overrides.propagationDelay !== undefined ? overrides.propagationDelay : 1,
    metadata: overrides.metadata || {},
    ...overrides,
  };
}

export function createDefaultTimingModel(
  timingId = 'default_timing',
  overrides: Partial<TimingModel> = {},
): TimingModel {
  return {
    timingId,
    clockTick: overrides.clockTick !== undefined ? overrides.clockTick : 0,
    delayNs: overrides.delayNs !== undefined ? overrides.delayNs : 1000,
    updateRate: overrides.updateRate !== undefined ? overrides.updateRate : 1,
    metadata: overrides.metadata || {},
    ...overrides,
  };
}

export function createDefaultSignalPropagationRuntime(
  runtimeId = 'default_runtime',
  overrides: Partial<SignalPropagationRuntimeModel> = {},
): SignalPropagationRuntimeModel {
  return {
    runtimeId,
    status: overrides.status || 'STOPPED',
    currentClockTick: overrides.currentClockTick !== undefined ? overrides.currentClockTick : 0,
    activePacketIds: overrides.activePacketIds || [],
    metadata: overrides.metadata || {},
    ...overrides,
  };
}

// ─── MODEL VALIDATORS ─────────────────────────────────────────────────────────

export function validateSignalPacketModel(
  model: SignalPacketModel,
  warnPrefix = '[SignalPropagation]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_PACKET_MODEL', message: 'Signal packet model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.packetId) {
    warnings.push({ code: 'INVALID_PACKET_ID', message: 'Signal packet ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.sourceNodeId) {
    warnings.push({ code: 'INVALID_SOURCE_NODE_ID', message: `Signal packet "${model.packetId}" has empty sourceNodeId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.targetNodeId) {
    warnings.push({ code: 'INVALID_TARGET_NODE_ID', message: `Signal packet "${model.packetId}" has empty targetNodeId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.logicState !== 'string') {
    warnings.push({ code: 'INVALID_LOGIC_STATE', message: `Signal packet "${model.packetId}" has invalid logicState.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.voltage !== 'number') {
    warnings.push({ code: 'INVALID_VOLTAGE', message: `Signal packet "${model.packetId}" has invalid voltage.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.timestamp !== 'number') {
    warnings.push({ code: 'INVALID_TIMESTAMP', message: `Signal packet "${model.packetId}" has invalid timestamp.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.metadata !== 'object' || model.metadata === null || Array.isArray(model.metadata)) {
    warnings.push({ code: 'INVALID_METADATA', message: `Signal packet "${model.packetId}" has invalid metadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validatePropagationPathModel(
  model: PropagationPathModel,
  warnPrefix = '[SignalPropagation]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_PATH_MODEL', message: 'Propagation path model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.pathId) {
    warnings.push({ code: 'INVALID_PATH_ID', message: 'Propagation path ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.nodeIds) || model.nodeIds.length < 2) {
    warnings.push({ code: 'INVALID_NODE_IDS', message: `Propagation path "${model.pathId}" has invalid nodeIds list.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.pathLength !== 'number') {
    warnings.push({ code: 'INVALID_PATH_LENGTH', message: `Propagation path "${model.pathId}" has invalid pathLength.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.propagationDelay !== 'number') {
    warnings.push({ code: 'INVALID_PROPAGATION_DELAY', message: `Propagation path "${model.pathId}" has invalid propagationDelay.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.metadata !== 'object' || model.metadata === null || Array.isArray(model.metadata)) {
    warnings.push({ code: 'INVALID_METADATA', message: `Propagation path "${model.pathId}" has invalid metadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateTimingModel(
  model: TimingModel,
  warnPrefix = '[SignalPropagation]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_TIMING_MODEL', message: 'Timing model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.timingId) {
    warnings.push({ code: 'INVALID_TIMING_ID', message: 'Timing ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.clockTick !== 'number') {
    warnings.push({ code: 'INVALID_CLOCK_TICK', message: `Timing model "${model.timingId}" has invalid clockTick.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.delayNs !== 'number') {
    warnings.push({ code: 'INVALID_DELAY_NS', message: `Timing model "${model.timingId}" has invalid delayNs.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.updateRate !== 'number') {
    warnings.push({ code: 'INVALID_UPDATE_RATE', message: `Timing model "${model.timingId}" has invalid updateRate.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.metadata !== 'object' || model.metadata === null || Array.isArray(model.metadata)) {
    warnings.push({ code: 'INVALID_METADATA', message: `Timing model "${model.timingId}" has invalid metadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateSignalPropagationRuntimeModel(
  model: SignalPropagationRuntimeModel,
  warnPrefix = '[SignalPropagation]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_RUNTIME_MODEL', message: 'Signal propagation runtime model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.runtimeId) {
    warnings.push({ code: 'INVALID_RUNTIME_ID', message: 'Signal propagation runtime ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.status !== 'string') {
    warnings.push({ code: 'INVALID_STATUS', message: `Signal propagation runtime "${model.runtimeId}" has invalid status.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.currentClockTick !== 'number') {
    warnings.push({ code: 'INVALID_CURRENT_CLOCK_TICK', message: `Signal propagation runtime "${model.runtimeId}" has invalid currentClockTick.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.activePacketIds)) {
    warnings.push({ code: 'INVALID_ACTIVE_PACKET_IDS', message: `Signal propagation runtime "${model.runtimeId}" has invalid activePacketIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.metadata !== 'object' || model.metadata === null || Array.isArray(model.metadata)) {
    warnings.push({ code: 'INVALID_METADATA', message: `Signal propagation runtime "${model.runtimeId}" has invalid metadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ─── DUPLICATE VALIDATORS ─────────────────────────────────────────────────────

export function validateDuplicateSignalPacketIds(
  models: SignalPacketModel[],
  warnPrefix = '[SignalPropagation]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.packetId)) {
      warnings.push({ code: 'DUPLICATE_PACKET_ID', message: `Duplicate signal packet ID "${m.packetId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.packetId);
  }
  return warnings;
}

export function validateDuplicatePropagationPathIds(
  models: PropagationPathModel[],
  warnPrefix = '[SignalPropagation]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.pathId)) {
      warnings.push({ code: 'DUPLICATE_PATH_ID', message: `Duplicate propagation path ID "${m.pathId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.pathId);
  }
  return warnings;
}

export function validateDuplicateTimingModelIds(
  models: TimingModel[],
  warnPrefix = '[SignalPropagation]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.timingId)) {
      warnings.push({ code: 'DUPLICATE_TIMING_ID', message: `Duplicate timing ID "${m.timingId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.timingId);
  }
  return warnings;
}

export function validateDuplicateSignalPropagationRuntimeIds(
  models: SignalPropagationRuntimeModel[],
  warnPrefix = '[SignalPropagation]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.runtimeId)) {
      warnings.push({ code: 'DUPLICATE_RUNTIME_ID', message: `Duplicate signal propagation runtime ID "${m.runtimeId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.runtimeId);
  }
  return warnings;
}

// ─── BEHAVIORS & LOOP IMPLEMENTATION ──────────────────────────────────────────

export function createSignalPacket(
  rt: any,
  sourceNodeId: string,
  targetNodeId: string,
  logicState: string,
  voltage: number,
  remainingTicks: number,
  metadata: Record<string, any> = {},
): SignalPacketModel {
  const timestamp = rt.getTimingModels ? (rt.getTimingModels()[0]?.clockTick || 0) : 0;
  const packetId = `pkt_${sourceNodeId}_to_${targetNodeId}_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;
  const packet = createDefaultSignalPacket(packetId, {
    sourceNodeId,
    targetNodeId,
    logicState,
    voltage,
    timestamp,
    metadata: {
      ...metadata,
      remainingTicks,
    },
  });
  rt.registerSignalPacketModel(packet);
  return packet;
}

export function propagateSignal(
  rt: any,
  packetId: string,
  currentTick: number,
): void {
  const packet = rt.getSignalPacketModel(packetId);
  if (!packet) return;

  const remaining = (packet.metadata.remainingTicks ?? 1) - 1;
  packet.metadata.remainingTicks = remaining;

  if (remaining <= 0) {
    // Arrived! Deliver and trigger downstream
    rt.removeSignalPacketModel(packetId);

    // Update target node state in registry
    const node = rt.getElectricalNodeModel(packet.targetNodeId);
    if (node) {
      node.voltage = packet.voltage;
      node.logicState = packet.logicState;
      if (packet.metadata.pwm) {
        node.metadata.pwm = safeDeepCopy(packet.metadata.pwm);
      } else {
        delete node.metadata.pwm;
      }
      rt.registerElectricalNodeModel(node);
    }

    // Resolve component-specific reactions
    const targetNode = rt.getElectricalNodeModel(packet.targetNodeId);
    const paths: PropagationPathModel[] = rt.getPropagationPathModels();

    // Trigger downstream propagation based on paths starting at packet.targetNodeId
    const isDriver = targetNode && (
      targetNode.pinId === 'GND' || targetNode.nodeId.toLowerCase().includes('gnd') || targetNode.nodeType === 'GROUND_RAIL' ||
      targetNode.pinId === 'VCC' || targetNode.nodeId.toLowerCase().includes('vcc') || targetNode.nodeType === 'POWER_RAIL' || targetNode.nodeId.toLowerCase().includes('3v3') || targetNode.nodeId.toLowerCase().includes('5v') ||
      (targetNode.nodeType === 'GPIO_PIN' && targetNode.metadata.direction === 'OUTPUT')
    );

    if (!isDriver) {
      for (const path of paths) {
        if (path.nodeIds[0] === packet.targetNodeId) {
          // Do not propagate back to the source node we just came from
          if (path.nodeIds[1] === packet.sourceNodeId) continue;

          const nextTarget = path.nodeIds[1];
          createSignalPacket(
            rt,
            packet.targetNodeId,
            nextTarget,
            packet.logicState,
            packet.voltage,
            path.propagationDelay,
            packet.metadata,
          );
        }
      }
    }

    if (targetNode && targetNode.componentId) {
      const compId = targetNode.componentId;
      const compIdLower = compId.toLowerCase();

      // 1. Resistor traversal (propagate instantly/delayed to other pin)
      if (compIdLower.includes('resistor') || compIdLower.includes('wire') || compIdLower.includes('jumper') || compIdLower.includes('passive')) {
        const sibling = rt.getElectricalNodeModels().find((n: any) => n.componentId === compId && n.nodeId !== packet.targetNodeId);
        if (sibling && (sibling.logicState !== packet.logicState || sibling.voltage !== packet.voltage)) {
          // Propagate with 1 tick delay across the passive component
          createSignalPacket(rt, packet.targetNodeId, sibling.nodeId, packet.logicState, packet.voltage, 1, packet.metadata);
        }
      }

      // 2. LED Reaction
      if (compIdLower.includes('led')) {
        const ledNodes = rt.getElectricalNodeModels().filter((n: any) => n.componentId === compId);
        const anode = ledNodes.find((n: any) => n.pinId === 'ANODE' || n.pinId === 'A');
        const cathode = ledNodes.find((n: any) => n.pinId === 'CATHODE' || n.pinId === 'K');

        if (anode && cathode) {
          const vDiff = anode.voltage - cathode.voltage;
          if (vDiff >= 1.5) {
            let brightness = 100;
            if (anode.metadata.pwm && typeof anode.metadata.pwm.dutyCycle === 'number') {
              brightness = Math.round(anode.metadata.pwm.dutyCycle * 100);
            }
            anode.logicState = brightness > 0 ? 'ON' : 'OFF';
            cathode.logicState = brightness > 0 ? 'ON' : 'OFF';

            for (const n of ledNodes) {
              n.metadata.state = brightness > 0 ? 'ON' : 'OFF';
              n.metadata.current = parseFloat(((vDiff - 1.5) / 0.220).toFixed(2));
              n.metadata.brightness = brightness;
              rt.registerElectricalNodeModel(n);
            }
          } else {
            anode.logicState = 'OFF';
            cathode.logicState = 'OFF';
            for (const n of ledNodes) {
              n.metadata.state = 'OFF';
              n.metadata.current = 0;
              n.metadata.brightness = 0;
              rt.registerElectricalNodeModel(n);
            }
          }
        }
      }

      // 3. HC-SR04 ultrasonic sensor Trigger pulse
      if (compIdLower.includes('sr04') || compIdLower.includes('ultrasonic') || compIdLower.includes('sonar')) {
        if (targetNode.pinId === 'TRIG' && (packet.logicState === 'HIGH' || packet.voltage > 2.0)) {
          const echoPin = rt.getElectricalNodeModels().find((n: any) => n.componentId === compId && n.pinId === 'ECHO');
          if (echoPin) {
            // Read distance from backend sensor metadata, default to 40 cm
            const backend = rt.getHardwareBackend ? rt.getHardwareBackend() : null;
            const distance = backend ? parseFloat(backend.readSensor({ componentId: compId }, 'distanceCm')) || 40 : 40;

            // Echo stays HIGH for duration proportional to distance: e.g. delay of Math.round(distance * 5.8) ticks
            const echoTicks = Math.max(1, Math.round(distance * 5.8));

            // Immediately set ECHO pin HIGH
            echoPin.voltage = 3.3;
            echoPin.logicState = 'HIGH';
            rt.registerElectricalNodeModel(echoPin);

            // Propagate HIGH pulse to nodes connected to ECHO pin
            const echoPaths = paths.filter(p => p.nodeIds[0] === echoPin.nodeId);
            for (const p of echoPaths) {
              createSignalPacket(rt, echoPin.nodeId, p.nodeIds[1], 'HIGH', 3.3, p.propagationDelay);
            }

            // Schedule a packet to bring ECHO pin back to LOW
            createSignalPacket(rt, echoPin.nodeId, echoPin.nodeId, 'LOW', 0, echoTicks, { isEchoPulseReset: true });
          }
        } else if (targetNode.pinId === 'ECHO' && packet.metadata.isEchoPulseReset) {
          targetNode.voltage = 0;
          targetNode.logicState = 'LOW';
          rt.registerElectricalNodeModel(targetNode);

          // Propagate LOW pulse to nodes connected to ECHO pin
          const echoPaths = paths.filter(p => p.nodeIds[0] === targetNode.nodeId);
          for (const p of echoPaths) {
            createSignalPacket(rt, targetNode.nodeId, p.nodeIds[1], 'LOW', 0, p.propagationDelay);
          }
        }
      }
    }
  } else {
    // Update packet state in registry with decremented ticks
    rt.registerSignalPacketModel(packet);
  }
}

export function updateSignalState(rt: any, nodeId: string, logicState: string): void {
  const node = rt.getElectricalNodeModel(nodeId);
  if (!node) return;

  node.logicState = logicState;
  if (logicState === 'HIGH') {
    node.voltage = 3.3;
  } else if (logicState === 'LOW') {
    node.voltage = 0;
  }
  rt.registerElectricalNodeModel(node);

  // Trigger propagation
  const paths: PropagationPathModel[] = rt.getPropagationPathModels();
  for (const path of paths) {
    if (path.nodeIds[0] === nodeId) {
      createSignalPacket(rt, nodeId, path.nodeIds[1], logicState, node.voltage, path.propagationDelay, node.metadata);
    }
  }
}

export function updateVoltageState(rt: any, nodeId: string, voltage: number): void {
  const node = rt.getElectricalNodeModel(nodeId);
  if (!node) return;

  node.voltage = voltage;
  if (voltage > 2.0) {
    node.logicState = 'HIGH';
  } else if (voltage < 0.8) {
    node.logicState = 'LOW';
  }
  rt.registerElectricalNodeModel(node);

  // Trigger propagation
  const paths: PropagationPathModel[] = rt.getPropagationPathModels();
  for (const path of paths) {
    if (path.nodeIds[0] === nodeId) {
      createSignalPacket(rt, nodeId, path.nodeIds[1], node.logicState, voltage, path.propagationDelay, node.metadata);
    }
  }
}

export function tickSimulation(rt: any): void {
  // 1. Initialize timing model if empty
  let timing = rt.getTimingModels()[0];
  if (!timing) {
    timing = createDefaultTimingModel('default_timing');
    rt.registerTimingModel(timing);
  }

  // 2. Initialize runtime state if empty
  let runtimeState = rt.getSignalPropagationRuntimeModels()[0];
  if (!runtimeState) {
    runtimeState = createDefaultSignalPropagationRuntime('default_runtime', { status: 'RUNNING' });
    rt.registerSignalPropagationRuntimeModel(runtimeState);
  }

  if (runtimeState.status !== 'RUNNING') return;

  // Increment clock tick
  timing.clockTick += 1;
  runtimeState.currentClockTick = timing.clockTick;
  rt.registerTimingModel(timing);
  rt.registerSignalPropagationRuntimeModel(runtimeState);

  // 3. Scan drivers (ESP32 output GPIO, VCC, GND) for changes and auto-trigger signal packets
  const nodes = rt.getElectricalNodeModels();
  for (const node of nodes) {
    const isGnd = node.pinId === 'GND' || node.nodeId.toLowerCase().includes('gnd') || node.nodeType === 'GROUND_RAIL';
    const isVcc = node.pinId === 'VCC' || node.nodeId.toLowerCase().includes('vcc') || node.nodeType === 'POWER_RAIL' || node.nodeId.toLowerCase().includes('3v3') || node.nodeId.toLowerCase().includes('5v');
    const isGpioOutput = node.nodeType === 'GPIO_PIN' && node.metadata.direction === 'OUTPUT';

    if (isGnd || isVcc || isGpioOutput) {
      const lastVal = node.metadata.lastState;
      const lastVol = node.metadata.lastVoltage;

      if (lastVal !== node.logicState || lastVol !== node.voltage) {
        node.metadata.lastState = node.logicState;
        node.metadata.lastVoltage = node.voltage;
        rt.registerElectricalNodeModel(node);

        // Auto-propagate to paths starting at this driver pin
        const paths = rt.getPropagationPathModels();
        for (const path of paths) {
          if (path.nodeIds[0] === node.nodeId) {
            createSignalPacket(rt, node.nodeId, path.nodeIds[1], node.logicState, node.voltage, path.propagationDelay, node.metadata);
          }
        }
      }
    }
  }

  // 4. Tick all active signal packets in the registry
  const packets: SignalPacketModel[] = rt.getSignalPacketModels();
  for (const p of packets) {
    propagateSignal(rt, p.packetId, timing.clockTick);
  }

  // 5. Update activePacketIds on the runtime model
  const remainingPackets = rt.getSignalPacketModels();
  runtimeState.activePacketIds = remainingPackets.map((p: any) => p.packetId);
  rt.registerSignalPropagationRuntimeModel(runtimeState);
}

export function stepSimulation(rt: any, steps = 1): void {
  for (let i = 0; i < steps; i++) {
    tickSimulation(rt);
  }
}

// Helper to auto-generate default paths matching the current connectivity graph
export function generateDefaultPaths(rt: any): void {
  // Clear any existing paths
  rt.clearPropagationPathModels();

  // Scan all electrical connections and register paths
  const conns = rt.getElectricalConnectionModels ? rt.getElectricalConnectionModels() : [];
  let index = 0;
  for (const conn of conns) {
    if (conn.connectionState === 'CONNECTED' || conn.connectionState === '') {
      const pathId = `path_conn_${index++}`;
      const path = createDefaultPropagationPath(pathId, {
        nodeIds: [conn.sourceNodeId, conn.targetNodeId],
        propagationDelay: 1,
      });
      rt.registerPropagationPathModel(path);

      // Bi-directional path for propagation simulation
      const pathRevId = `path_conn_rev_${index++}`;
      const pathRev = createDefaultPropagationPath(pathRevId, {
        nodeIds: [conn.targetNodeId, conn.sourceNodeId],
        propagationDelay: 1,
      });
      rt.registerPropagationPathModel(pathRev);
    }
  }

  // Scan breadboard rows and rails and link all nodes in the same row/rail
  const rows = rt.getBreadboardRowModels ? rt.getBreadboardRowModels() : [];
  for (const row of rows) {
    const nids = row.nodeIds;
    if (nids.length >= 2) {
      for (let i = 0; i < nids.length; i++) {
        for (let j = i + 1; j < nids.length; j++) {
          const pathId = `path_row_${index++}`;
          rt.registerPropagationPathModel(createDefaultPropagationPath(pathId, {
            nodeIds: [nids[i], nids[j]],
            propagationDelay: 1,
          }));
          const pathIdRev = `path_row_${index++}`;
          rt.registerPropagationPathModel(createDefaultPropagationPath(pathIdRev, {
            nodeIds: [nids[j], nids[i]],
            propagationDelay: 1,
          }));
        }
      }
    }
  }

  const rails = rt.getBreadboardRailModels ? rt.getBreadboardRailModels() : [];
  for (const rail of rails) {
    const nids = rail.nodeIds;
    if (nids.length >= 2) {
      for (let i = 0; i < nids.length; i++) {
        for (let j = i + 1; j < nids.length; j++) {
          const pathId = `path_rail_${index++}`;
          rt.registerPropagationPathModel(createDefaultPropagationPath(pathId, {
            nodeIds: [nids[i], nids[j]],
            propagationDelay: 1,
          }));
          const pathIdRev = `path_rail_${index++}`;
          rt.registerPropagationPathModel(createDefaultPropagationPath(pathIdRev, {
            nodeIds: [nids[j], nids[i]],
            propagationDelay: 1,
          }));
        }
      }
    }
  }
}

// ─── SYNCHRONIZER CLASS ────────────────────────────────────────────────────────

export class SignalPropagationSynchronizer {
  private readonly signalPacketRegistry = new RenderRegistry<SignalPacketModel>();
  private readonly signalPropagationRuntimeRegistry = new RenderRegistry<SignalPropagationRuntimeModel>();
  private readonly propagationPathRegistry = new RenderRegistry<PropagationPathModel>();
  private readonly timingModelRegistry = new RenderRegistry<TimingModel>();

  private readonly warnPrefix = '[SignalPropagationSynchronizer]';

  public get signalPackets(): RenderRegistry<SignalPacketModel> {
    return this.signalPacketRegistry;
  }

  public get signalPropagationRuntimes(): RenderRegistry<SignalPropagationRuntimeModel> {
    return this.signalPropagationRuntimeRegistry;
  }

  public get propagationPaths(): RenderRegistry<PropagationPathModel> {
    return this.propagationPathRegistry;
  }

  public get timingModels(): RenderRegistry<TimingModel> {
    return this.timingModelRegistry;
  }

  public buildSnapshot(
    signalPackets: SignalPacketModel[] = [],
    signalPropagationRuntimes: SignalPropagationRuntimeModel[] = [],
    propagationPaths: PropagationPathModel[] = [],
    timingModels: TimingModel[] = [],
  ): SignalPropagationSnapshot {
    validateDuplicateSignalPacketIds(signalPackets, this.warnPrefix);
    validateDuplicateSignalPropagationRuntimeIds(signalPropagationRuntimes, this.warnPrefix);
    validateDuplicatePropagationPathIds(propagationPaths, this.warnPrefix);
    validateDuplicateTimingModelIds(timingModels, this.warnPrefix);

    for (const m of signalPackets) {
      validateSignalPacketModel(m, this.warnPrefix);
      this.signalPacketRegistry.register(m.packetId, m, this.warnPrefix);
    }
    for (const m of signalPropagationRuntimes) {
      validateSignalPropagationRuntimeModel(m, this.warnPrefix);
      this.signalPropagationRuntimeRegistry.register(m.runtimeId, m, this.warnPrefix);
    }
    for (const m of propagationPaths) {
      validatePropagationPathModel(m, this.warnPrefix);
      this.propagationPathRegistry.register(m.pathId, m, this.warnPrefix);
    }
    for (const m of timingModels) {
      validateTimingModel(m, this.warnPrefix);
      this.timingModelRegistry.register(m.timingId, m, this.warnPrefix);
    }

    return this.clone();
  }

  public clear(): void {
    this.signalPacketRegistry.clear();
    this.signalPropagationRuntimeRegistry.clear();
    this.propagationPathRegistry.clear();
    this.timingModelRegistry.clear();
  }

  public clone(): SignalPropagationSnapshot {
    return {
      signalPackets: safeDeepCopy(this.signalPacketRegistry.getAll()),
      signalPropagationRuntimes: safeDeepCopy(this.signalPropagationRuntimeRegistry.getAll()),
      propagationPaths: safeDeepCopy(this.propagationPathRegistry.getAll()),
      timingModels: safeDeepCopy(this.timingModelRegistry.getAll()),
    };
  }

  public toJSON(): string {
    return JSON.stringify(this.clone());
  }

  public fromJSON(json: string): void {
    try {
      const data = JSON.parse(json) as Partial<SignalPropagationSnapshot>;
      this.clear();
      if (data) {
        this.buildSnapshot(
          data.signalPackets || [],
          data.signalPropagationRuntimes || [],
          data.propagationPaths || [],
          data.timingModels || [],
        );
      }
    } catch (err: any) {
      console.warn(`${this.warnPrefix} failed to parse JSON snapshot: ${err.message}`);
    }
  }

  public sync(snapshot: SignalPropagationSnapshot): void {
    this.clear();
    if (snapshot) {
      this.buildSnapshot(
        snapshot.signalPackets || [],
        snapshot.signalPropagationRuntimes || [],
        snapshot.propagationPaths || [],
        snapshot.timingModels || [],
      );
    }
  }
}
