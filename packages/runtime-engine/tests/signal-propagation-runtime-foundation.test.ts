import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import {
  SignalPacketModel,
  SignalPropagationRuntimeModel,
  PropagationPathModel,
  TimingModel,
  StageState,
  ElectricalNodeModel,
  BreadboardRowModel,
  ElectricalConnectionModel,
} from '../src/types';
import {
  createDefaultSignalPacket,
  createDefaultPropagationPath,
  createDefaultTimingModel,
  createDefaultSignalPropagationRuntime,
  validateSignalPacketModel,
  validatePropagationPathModel,
  validateTimingModel,
  validateSignalPropagationRuntimeModel,
  validateDuplicateSignalPacketIds,
  validateDuplicatePropagationPathIds,
  validateDuplicateTimingModelIds,
  validateDuplicateSignalPropagationRuntimeIds,
  SignalPropagationSynchronizer,
  createDefaultElectricalNodeModel,
  createDefaultBreadboardRowModel,
  createDefaultElectricalConnectionModel,
  generateDefaultPaths,
  updateSignalState,
  updateVoltageState,
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

function packet(i: number, id?: string, overrides: Partial<SignalPacketModel> = {}): SignalPacketModel {
  return createDefaultSignalPacket(id || `pkt_${i}`, {
    sourceNodeId: `src_${i}`,
    targetNodeId: `tgt_${i}`,
    logicState: 'FLOATING',
    voltage: 0,
    timestamp: 0,
    metadata: {},
    ...overrides,
  });
}

function path(i: number, id?: string, overrides: Partial<PropagationPathModel> = {}): PropagationPathModel {
  return createDefaultPropagationPath(id || `path_${i}`, {
    nodeIds: [`src_${i}`, `tgt_${i}`],
    pathLength: 1,
    propagationDelay: 1,
    metadata: {},
    ...overrides,
  });
}

function timing(i: number, id?: string, overrides: Partial<TimingModel> = {}): TimingModel {
  return createDefaultTimingModel(id || `timing_${i}`, {
    clockTick: 0,
    delayNs: 1000,
    updateRate: 1,
    metadata: {},
    ...overrides,
  });
}

function propagationRuntime(i: number, id?: string, overrides: Partial<SignalPropagationRuntimeModel> = {}): SignalPropagationRuntimeModel {
  return createDefaultSignalPropagationRuntime(id || `rt_${i}`, {
    status: 'STOPPED',
    currentClockTick: 0,
    activePacketIds: [],
    metadata: {},
    ...overrides,
  });
}

const CRUD_ITER = 2400;

describe('Phase 17B: Signal Propagation Runtime Foundation Tests', () => {
  let warnSpy: any;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: CRUD Operations
  // ═══════════════════════════════════════════════════════════════

  const modelsConfig = [
    {
      name: 'SignalPacketModel',
      idKey: 'packetId',
      register: 'registerSignalPacketModel',
      get: 'getSignalPacketModel',
      getAll: 'getSignalPacketModels',
      update: 'updateSignalPacketModel',
      remove: 'removeSignalPacketModel',
      clear: 'clearSignalPacketModels',
      keys: 'getSignalPacketModelKeys',
      has: 'hasSignalPacketModel',
      factory: packet,
      idPrefix: 'pkt',
      updateField: 'logicState',
      updateValue: 'UPDATED_HIGH',
    },
    {
      name: 'SignalPropagationRuntimeModel',
      idKey: 'runtimeId',
      register: 'registerSignalPropagationRuntimeModel',
      get: 'getSignalPropagationRuntimeModel',
      getAll: 'getSignalPropagationRuntimeModels',
      update: 'updateSignalPropagationRuntimeModel',
      remove: 'removeSignalPropagationRuntimeModel',
      clear: 'clearSignalPropagationRuntimeModels',
      keys: 'getSignalPropagationRuntimeModelKeys',
      has: 'hasSignalPropagationRuntimeModel',
      factory: propagationRuntime,
      idPrefix: 'rt',
      updateField: 'status',
      updateValue: 'RUNNING',
    },
    {
      name: 'PropagationPathModel',
      idKey: 'pathId',
      register: 'registerPropagationPathModel',
      get: 'getPropagationPathModel',
      getAll: 'getPropagationPathModels',
      update: 'updatePropagationPathModel',
      remove: 'removePropagationPathModel',
      clear: 'clearPropagationPathModels',
      keys: 'getPropagationPathModelKeys',
      has: 'hasPropagationPathModel',
      factory: path,
      idPrefix: 'path',
      updateField: 'pathLength',
      updateValue: 42,
    },
    {
      name: 'TimingModel',
      idKey: 'timingId',
      register: 'registerTimingModel',
      get: 'getTimingModel',
      getAll: 'getTimingModels',
      update: 'updateTimingModel',
      remove: 'removeTimingModel',
      clear: 'clearTimingModels',
      keys: 'getTimingModelKeys',
      has: 'hasTimingModel',
      factory: timing,
      idPrefix: 'timing',
      updateField: 'clockTick',
      updateValue: 1234,
    },
  ];

  modelsConfig.forEach(config => {
    describe(`SECTION 1: ${config.name} CRUD`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        it(`registers and retrieves ${config.name} ${i}`, () => {
          const rt = runtime();
          const model = config.factory(i);
          (rt as any)[config.register](model);
          const result = (rt as any)[config.get](`${config.idPrefix}_${i}`);
          expect(result).toBeDefined();
          expect(result[config.idKey]).toBe(`${config.idPrefix}_${i}`);
        });
      }

      for (let i = 0; i < CRUD_ITER; i++) {
        it(`getAll returns ordered array for ${config.name} ${i}`, () => {
          const rt = runtime();
          (rt as any)[config.register](config.factory(i, `a_${i}`));
          (rt as any)[config.register](config.factory(i, `b_${i}`));
          const all = (rt as any)[config.getAll]();
          expect(all.length).toBe(2);
          expect(all[0][config.idKey]).toBe(`a_${i}`);
          expect(all[1][config.idKey]).toBe(`b_${i}`);
        });
      }

      for (let i = 0; i < CRUD_ITER; i++) {
        it(`updates ${config.name} ${i}`, () => {
          const rt = runtime();
          (rt as any)[config.register](config.factory(i));
          (rt as any)[config.update](`${config.idPrefix}_${i}`, { [config.updateField]: config.updateValue });
          const result = (rt as any)[config.get](`${config.idPrefix}_${i}`);
          expect(result[config.updateField]).toEqual(config.updateValue);
        });
      }

      for (let i = 0; i < CRUD_ITER; i++) {
        it(`removes ${config.name} ${i}`, () => {
          const rt = runtime();
          (rt as any)[config.register](config.factory(i));
          (rt as any)[config.remove](`${config.idPrefix}_${i}`);
          expect((rt as any)[config.get](`${config.idPrefix}_${i}`)).toBeUndefined();
        });
      }

      for (let i = 0; i < CRUD_ITER; i++) {
        it(`clears all ${config.name} ${i}`, () => {
          const rt = runtime();
          (rt as any)[config.register](config.factory(i, `a_${i}`));
          (rt as any)[config.register](config.factory(i, `b_${i}`));
          (rt as any)[config.clear]();
          expect((rt as any)[config.getAll]().length).toBe(0);
        });
      }

      for (let i = 0; i < CRUD_ITER; i++) {
        it(`getKeys returns ordered keys for ${config.name} ${i}`, () => {
          const rt = runtime();
          (rt as any)[config.register](config.factory(i, `k1_${i}`));
          (rt as any)[config.register](config.factory(i, `k2_${i}`));
          const keys = (rt as any)[config.keys]();
          expect(keys).toEqual([`k1_${i}`, `k2_${i}`]);
        });
      }

      for (let i = 0; i < CRUD_ITER; i++) {
        it(`has returns existence for ${config.name} ${i}`, () => {
          const rt = runtime();
          (rt as any)[config.register](config.factory(i));
          expect((rt as any)[config.has](`${config.idPrefix}_${i}`)).toBe(true);
          expect((rt as any)[config.has](`nonexistent_${i}`)).toBe(false);
        });
      }

      for (let i = 0; i < CRUD_ITER; i++) {
        it(`warns on duplicate registration for ${config.name} ${i}`, () => {
          const rt = runtime();
          const model = config.factory(i);
          (rt as any)[config.register](model);
          (rt as any)[config.register](model);
          expect(warnSpy).toHaveBeenCalled();
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Factory and Default Values
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 2: Factory and Default Values', () => {
    it('creates default signal packet with valid layout', () => {
      const p = createDefaultSignalPacket();
      expect(p.packetId).toBe('default_packet');
      expect(p.sourceNodeId).toBe('');
      expect(p.targetNodeId).toBe('');
      expect(p.logicState).toBe('FLOATING');
      expect(p.voltage).toBe(0);
      expect(p.timestamp).toBe(0);
      expect(p.metadata).toEqual({});
    });

    it('creates default propagation path with valid layout', () => {
      const p = createDefaultPropagationPath();
      expect(p.pathId).toBe('default_path');
      expect(p.nodeIds).toEqual([]);
      expect(p.pathLength).toBe(1);
      expect(p.propagationDelay).toBe(1);
      expect(p.metadata).toEqual({});
    });

    it('creates default timing model with valid layout', () => {
      const t = createDefaultTimingModel();
      expect(t.timingId).toBe('default_timing');
      expect(t.clockTick).toBe(0);
      expect(t.delayNs).toBe(1000);
      expect(t.updateRate).toBe(1);
      expect(t.metadata).toEqual({});
    });

    it('creates default signal propagation runtime with valid layout', () => {
      const rt = createDefaultSignalPropagationRuntime();
      expect(rt.runtimeId).toBe('default_runtime');
      expect(rt.status).toBe('STOPPED');
      expect(rt.currentClockTick).toBe(0);
      expect(rt.activePacketIds).toEqual([]);
      expect(rt.metadata).toEqual({});
    });

    for (let i = 0; i < 100; i++) {
      it(`overrides default fields for factories ${i}`, () => {
        const p = createDefaultSignalPacket(`p_${i}`, { voltage: 3.3, metadata: { test: i } });
        expect(p.packetId).toBe(`p_${i}`);
        expect(p.voltage).toBe(3.3);
        expect(p.metadata.test).toBe(i);

        const pathModel = createDefaultPropagationPath(`path_${i}`, { propagationDelay: 10 });
        expect(pathModel.pathId).toBe(`path_${i}`);
        expect(pathModel.propagationDelay).toBe(10);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Validation
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 3: Model Validation', () => {
    it('validateSignalPacketModel catches invalid inputs', () => {
      const w1 = validateSignalPacketModel(null as any);
      expect(w1.length).toBeGreaterThan(0);

      const w2 = validateSignalPacketModel({} as any);
      expect(w2.length).toBeGreaterThan(0);
    });

    it('validatePropagationPathModel catches invalid inputs', () => {
      const w1 = validatePropagationPathModel(null as any);
      expect(w1.length).toBeGreaterThan(0);

      const w2 = validatePropagationPathModel({} as any);
      expect(w2.length).toBeGreaterThan(0);
    });

    it('validateTimingModel catches invalid inputs', () => {
      const w1 = validateTimingModel(null as any);
      expect(w1.length).toBeGreaterThan(0);

      const w2 = validateTimingModel({} as any);
      expect(w2.length).toBeGreaterThan(0);
    });

    it('validateSignalPropagationRuntimeModel catches invalid inputs', () => {
      const w1 = validateSignalPropagationRuntimeModel(null as any);
      expect(w1.length).toBeGreaterThan(0);

      const w2 = validateSignalPropagationRuntimeModel({} as any);
      expect(w2.length).toBeGreaterThan(0);
    });

    it('duplicate checkers catch identical IDs', () => {
      const packets = [packet(1, 'pkt1'), packet(1, 'pkt1')];
      const w1 = validateDuplicateSignalPacketIds(packets);
      expect(w1.length).toBeGreaterThan(0);

      const paths = [path(1, 'path1'), path(1, 'path1')];
      const w2 = validateDuplicatePropagationPathIds(paths);
      expect(w2.length).toBeGreaterThan(0);

      const timings = [timing(1, 't1'), timing(1, 't1')];
      const w3 = validateDuplicateTimingModelIds(timings);
      expect(w3.length).toBeGreaterThan(0);

      const runtimes = [propagationRuntime(1, 'rt1'), propagationRuntime(1, 'rt1')];
      const w4 = validateDuplicateSignalPropagationRuntimeIds(runtimes);
      expect(w4.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: SignalPropagationSynchronizer
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 4: SignalPropagationSynchronizer Operations', () => {
    for (let i = 0; i < 50; i++) {
      it(`synchronizes and exports json snapshot ${i}`, () => {
        const sync = new SignalPropagationSynchronizer();
        sync.buildSnapshot([packet(i)], [propagationRuntime(i)], [path(i)], [timing(i)]);
        const snap = sync.clone();
        expect(snap.signalPackets.length).toBe(1);
        expect(snap.signalPropagationRuntimes.length).toBe(1);

        const json = sync.toJSON();
        const sync2 = new SignalPropagationSynchronizer();
        sync2.fromJSON(json);
        expect(sync2.signalPackets.getAll().length).toBe(1);
        expect(sync2.signalPropagationRuntimes.getAll().length).toBe(1);
      });
    }

    it('clears synchronizer registries correctly', () => {
      const sync = new SignalPropagationSynchronizer();
      sync.buildSnapshot([packet(1)], [propagationRuntime(1)], [path(1)], [timing(1)]);
      sync.clear();
      expect(sync.signalPackets.getAll().length).toBe(0);
      expect(sync.signalPropagationRuntimes.getAll().length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: Lifecycle Integration
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 5: BaseRuntime Lifecycle Reset Safety', () => {
    it('initialize clears registries', () => {
      const rt = runtime();
      rt.registerSignalPacketModel(packet(1));
      rt.initialize();
      expect(rt.getSignalPacketModels().length).toBe(0);
    });

    it('stop clears registries', () => {
      const rt = runtime();
      rt.registerSignalPacketModel(packet(1));
      rt.stop();
      expect(rt.getSignalPacketModels().length).toBe(0);
    });

    it('reset clears registries', () => {
      const rt = runtime();
      rt.registerSignalPacketModel(packet(1));
      rt.reset();
      expect(rt.getSignalPacketModels().length).toBe(0);
    });

    it('destroy clears registries', () => {
      const rt = runtime();
      rt.registerSignalPacketModel(packet(1));
      rt.destroy();
      expect(rt.getSignalPacketModels().length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: Stage Snapshot Synchronization
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 6: Stage Snapshot Synchronization', () => {
    for (let i = 0; i < 50; i++) {
      it(`includes signal propagation models in stage snapshot ${i}`, () => {
        const rt = runtime();
        rt.registerSignalPacketModel(packet(i));
        rt.registerSignalPropagationRuntimeModel(propagationRuntime(i));
        rt.registerPropagationPathModel(path(i));
        rt.registerTimingModel(timing(i));

        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage')!;
        expect(stageSnap).toBeDefined();
        expect(stageSnap.signalPackets).toBeDefined();
        expect(stageSnap.signalPackets![0].packetId).toBe(`pkt_${i}`);
        expect(stageSnap.signalPropagationRuntimes).toBeDefined();
        expect(stageSnap.propagationPaths).toBeDefined();
        expect(stageSnap.timingModels).toBeDefined();
      });
    }

    it('produces undefined fields for empty registries', () => {
      const rt = runtime();
      const snapshot = rt.getStageSnapshot();
      const stageSnap = snapshot.find(s => s.targetId === 'stage')!;
      expect(stageSnap).toBeDefined();
      expect(stageSnap.signalPackets).toBeUndefined();
      expect(stageSnap.signalPropagationRuntimes).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: Snapshot Serialization safety
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 7: Deserialization and Isolation Safety', () => {
    for (let i = 0; i < 50; i++) {
      it(`preserves registries on export/import round-trip ${i}`, () => {
        const rt1 = runtime();
        rt1.registerSignalPacketModel(packet(i));
        rt1.registerSignalPropagationRuntimeModel(propagationRuntime(i));
        rt1.registerPropagationPathModel(path(i));
        rt1.registerTimingModel(timing(i));

        const projectJson = rt1.exportProject();
        const rt2 = runtime();
        rt2.importProject(projectJson);

        expect(rt2.getSignalPacketModel(`pkt_${i}`)).toBeDefined();
        expect(rt2.getSignalPropagationRuntimeModel(`rt_${i}`)).toBeDefined();
        expect(rt2.getPropagationPathModel(`path_${i}`)).toBeDefined();
        expect(rt2.getTimingModel(`timing_${i}`)).toBeDefined();
      });
    }

    it('mutating retrieved models does not affect original registry', () => {
      const rt = runtime();
      rt.registerSignalPacketModel(packet(1));
      const p = rt.getSignalPacketModel('pkt_1')!;
      p.voltage = 9.9;
      const original = rt.getSignalPacketModel('pkt_1')!;
      expect(original.voltage).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 8: Real-World E2E Simulation Loop Test
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 8: Real-World E2E Simulation Loop Test', () => {
    const setupE2ECircuit = (rt: BaseRuntime) => {
      // Setup ESP32 Output node
      const gpio18 = createDefaultElectricalNodeModel('esp32_gpio18', {
        nodeType: 'GPIO_PIN',
        componentId: 'esp32',
        pinId: 'GPIO18',
        voltage: 0,
        logicState: 'LOW',
        metadata: { direction: 'OUTPUT', lastState: 'LOW', lastVoltage: 0 },
      });
      const gnd = createDefaultElectricalNodeModel('esp32_gnd', {
        nodeType: 'GPIO_PIN',
        componentId: 'esp32',
        pinId: 'GND',
        voltage: 0,
        logicState: 'LOW',
        metadata: { lastState: 'LOW', lastVoltage: 0 },
      });

      // Passive Resistor nodes (Resistor placed between Row 1 and Row 2)
      const resPin1 = createDefaultElectricalNodeModel('res1_p1', {
        nodeType: 'PASSIVE_PIN',
        componentId: 'resistor_1',
        pinId: '1',
      });
      const resPin2 = createDefaultElectricalNodeModel('res1_p2', {
        nodeType: 'PASSIVE_PIN',
        componentId: 'resistor_1',
        pinId: '2',
      });

      // LED nodes (LED Anode in Row 2, Cathode in Row 3)
      const ledAnode = createDefaultElectricalNodeModel('led1_anode', {
        nodeType: 'PASSIVE_PIN',
        componentId: 'led_1',
        pinId: 'ANODE',
      });
      const ledCathode = createDefaultElectricalNodeModel('led1_cathode', {
        nodeType: 'PASSIVE_PIN',
        componentId: 'led_1',
        pinId: 'CATHODE',
      });

      rt.registerElectricalNodeModel(gpio18);
      rt.registerElectricalNodeModel(gnd);
      rt.registerElectricalNodeModel(resPin1);
      rt.registerElectricalNodeModel(resPin2);
      rt.registerElectricalNodeModel(ledAnode);
      rt.registerElectricalNodeModel(ledCathode);

      // Connections and row memberships
      // Row 1 links esp32_gpio18 and res1_p1
      const row1 = createDefaultBreadboardRowModel('row_1', {
        rowIndex: 1,
        nodeIds: ['esp32_gpio18', 'res1_p1'],
      });
      // Row 2 links res1_p2 and led1_anode
      const row2 = createDefaultBreadboardRowModel('row_2', {
        rowIndex: 2,
        nodeIds: ['res1_p2', 'led1_anode'],
      });
      // Row 3 links led1_cathode and esp32_gnd
      const row3 = createDefaultBreadboardRowModel('row_3', {
        rowIndex: 3,
        nodeIds: ['led1_cathode', 'esp32_gnd'],
      });

      rt.registerBreadboardRowModel(row1);
      rt.registerBreadboardRowModel(row2);
      rt.registerBreadboardRowModel(row3);

      // Auto-generate bidirectional default paths
      rt.generateDefaultPaths();
    };

    it('propagates GPIO HIGH to Resistor, LED, and turns LED ON', () => {
      const rt = runtime();
      setupE2ECircuit(rt);

      // Clock tick 0: Initial state
      expect(rt.getTimingModels()[0]).toBeUndefined();
      expect(rt.getSignalPacketModels().length).toBe(0);

      // Toggle GPIO18 output to HIGH
      rt.updateElectricalNodeModel('esp32_gpio18', {
        voltage: 3.3,
        logicState: 'HIGH',
      });

      // Tick 1: Clock increments, driver detects change, spawns packet to res1_p1
      rt.tickSimulation();
      const packets1 = rt.getSignalPacketModels();
      expect(packets1.length).toBe(1);
      expect(rt.getElectricalNodeModel('res1_p1')!.logicState).toBe('HIGH');
      expect(rt.getElectricalNodeModel('res1_p1')!.voltage).toBe(3.3);
      const forwardPkt = packets1.find(p => p.targetNodeId === 'res1_p2')!;
      expect(forwardPkt).toBeDefined();
      expect(forwardPkt.sourceNodeId).toBe('res1_p1');

      // Tick 2: Packet arrives at res1_p1, updates node, passive traversal spawns packet to res1_p2
      rt.tickSimulation();
      const packets2 = rt.getSignalPacketModels();
      expect(packets2.length).toBe(1);
      expect(rt.getElectricalNodeModel('res1_p2')!.logicState).toBe('HIGH');
      const ledPkt = packets2.find(p => p.targetNodeId === 'led1_anode')!;
      expect(ledPkt).toBeDefined();
      expect(ledPkt.sourceNodeId).toBe('res1_p2');

      // Tick 3: Packet arrives at res1_p2, updates node, propagates to row member led1_anode, updates LED state
      rt.tickSimulation();
      const anode = rt.getElectricalNodeModel('led1_anode')!;
      const cathode = rt.getElectricalNodeModel('led1_cathode')!;
      expect(anode.metadata.state).toBe('ON');
      expect(anode.metadata.brightness).toBe(100);
      expect(anode.metadata.current).toBeGreaterThan(0);
      expect(cathode.metadata.state).toBe('ON');
    });

    it('propagates PWM duty cycle to LED brightness', () => {
      const rt = runtime();
      setupE2ECircuit(rt);

      // Toggle GPIO18 to PWM mode with 60% duty cycle
      rt.updateElectricalNodeModel('esp32_gpio18', {
        voltage: 3.3,
        logicState: 'HIGH',
        metadata: {
          direction: 'OUTPUT',
          pwm: { dutyCycle: 0.6 },
        },
      });

      // Tick 1-3 to propagate through resistor to LED
      rt.tickSimulation();
      rt.tickSimulation();
      rt.tickSimulation();

      const ledAnode = rt.getElectricalNodeModel('led1_anode')!;
      expect(ledAnode.metadata.state).toBe('ON');
      expect(ledAnode.metadata.brightness).toBe(60); // 0.6 * 100
    });

    it('ECHO pulse delay timing simulation loop on HC-SR04 ultrasonic sensor', () => {
      const rt = runtime();

      // Setup HC-SR04 trigger and echo nodes
      const trig = createDefaultElectricalNodeModel('sr04_trig', {
        nodeType: 'PASSIVE_PIN',
        componentId: 'ultrasonic_1',
        pinId: 'TRIG',
        voltage: 0,
        logicState: 'LOW',
      });
      const echo = createDefaultElectricalNodeModel('sr04_echo', {
        nodeType: 'PASSIVE_PIN',
        componentId: 'ultrasonic_1',
        pinId: 'ECHO',
        voltage: 0,
        logicState: 'LOW',
      });
      const mcuPin = createDefaultElectricalNodeModel('esp32_gpio19', {
        nodeType: 'GPIO_PIN',
        componentId: 'esp32',
        pinId: 'GPIO19',
        voltage: 0,
        logicState: 'LOW',
        metadata: { direction: 'OUTPUT', lastState: 'LOW', lastVoltage: 0 },
      });

      rt.registerElectricalNodeModel(trig);
      rt.registerElectricalNodeModel(echo);
      rt.registerElectricalNodeModel(mcuPin);

      // Row connecting MCU output to TRIG pin
      const row1 = createDefaultBreadboardRowModel('row_trig', {
        rowIndex: 1,
        nodeIds: ['esp32_gpio19', 'sr04_trig'],
      });
      rt.registerBreadboardRowModel(row1);

      rt.generateDefaultPaths();

      // Simulated backend provides reading distance of 10 cm
      const mockBackend = {
        readSensor: vi.fn().mockReturnValue(10),
      };
      (rt as any).getHardwareBackend = () => mockBackend;

      // MCU fires trigger pulse
      rt.updateElectricalNodeModel('esp32_gpio19', {
        voltage: 3.3,
        logicState: 'HIGH',
      });

      // Tick 1: trigger pulse propagates to sr04_trig, triggers ECHO HIGH and schedules reset
      rt.tickSimulation();
      expect(rt.getElectricalNodeModel('sr04_trig')!.logicState).toBe('HIGH');
      expect(rt.getElectricalNodeModel('sr04_echo')!.logicState).toBe('HIGH');
      expect(rt.getElectricalNodeModel('sr04_echo')!.voltage).toBe(3.3);

      // Verify the ECHO reset packet is in the queue
      const resetPacket = rt.getSignalPacketModels().find(p => p.metadata.isEchoPulseReset);
      expect(resetPacket).toBeDefined();
      expect(resetPacket!.metadata.remainingTicks).toBe(58);

      // Tick 2: resets ECHO remaining ticks decremented to 57
      rt.tickSimulation();
      expect(rt.getElectricalNodeModel('sr04_echo')!.logicState).toBe('HIGH');
      const resetPacket2 = rt.getSignalPacketModels().find(p => p.metadata.isEchoPulseReset);
      expect(resetPacket2).toBeDefined();
      expect(resetPacket2!.metadata.remainingTicks).toBe(57);

      // Run simulation steps to let the echo pulse run (56 ticks)
      rt.stepSimulation(56);
      expect(rt.getElectricalNodeModel('sr04_echo')!.logicState).toBe('HIGH');

      // Tick 57 (1 more tick) -> resets ECHO pin back to LOW
      rt.tickSimulation();
      expect(rt.getElectricalNodeModel('sr04_echo')!.logicState).toBe('LOW');
      expect(rt.getElectricalNodeModel('sr04_echo')!.voltage).toBe(0);
    });
  });
});
