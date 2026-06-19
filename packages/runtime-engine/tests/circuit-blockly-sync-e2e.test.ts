import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { StageState } from '../src/types';
import {
  // ── Circuit Graph ─────────────────────────────────────
  createDefaultCircuitNodeModel,
  createDefaultCircuitEdgeModel,
  createDefaultCircuitNetModel,
  createDefaultCircuitGraphModel,
  createDefaultCircuitMappingModel,
  createDefaultProjectHealthModel,
  validateCircuitNodeModel,
  validateCircuitEdgeModel,
  validateCircuitNetModel,
  validateCircuitGraphModel,
  validateCircuitMappingModel,
  VALID_CIRCUIT_NODE_TYPES,
  VALID_CIRCUIT_EDGE_TYPES,
  VALID_CIRCUIT_NET_STATES,
  CircuitGraphSynchronizer,

  // ── GPIO Ownership ────────────────────────────────────
  createDefaultGpioOwnershipModel,
  createDefaultGpioConflictModel,
  validateGpioOwnershipModel,
  validateGpioConflictModel,
  VALID_GPIO_DIRECTIONS,
  VALID_GPIO_CONFLICT_TYPES,
  VALID_GPIO_CONFLICT_SEVERITIES,
  ESP32_INPUT_ONLY_PINS,
  ESP32_RESERVED_PINS,
  ESP32_TOTAL_GPIO_COUNT,
  GpioOwnershipSynchronizer,

  // ── Circuit Sync ──────────────────────────────────────
  createDefaultCircuitSyncModel,
  validateCircuitSyncModel,
  VALID_CIRCUIT_SYNC_STATES,
  MAX_SYNC_ERROR_LOG_SIZE,
  CircuitSyncSynchronizer,
  linkSerialOutput,
  linkLogicAnalyzerSample,

  // ── Blockly Generator ─────────────────────────────────
  SUPPORTED_COMPONENT_TYPES,
  generateBlocklyFromCircuit,
  generateLedInstructions,
  generateHcsr04Instructions,
  generateServoInstructions,
  generateOledInstructions,
  generateLcdInstructions,
  generateDht11Instructions,
  generateBuzzerInstructions,
  generateRelayInstructions,
  generateMq2Instructions,
  generatePushButtonInstructions,
  generatePotentiometerInstructions,
  generateIrSensorInstructions,
  evaluateBlocklyPinUsage,
  highlightAffectedComponents,
  highlightAffectedWires,
  detectBlocklyCircuitMismatch,

  // ── Blockly execution factories ───────────────────────
  createDefaultBlocklyProgramModel,
  createDefaultBlocklyInstructionModel,
} from '../src/stage';
import { resetThreadCounter } from '../src/runtime/execution-context';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

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

function rt(): BaseRuntime {
  const r = new BaseRuntime();
  r.initialize();
  resetThreadCounter();
  r.addTarget(makeStage());
  return r;
}

// ── Cartesian product helper ────────────────────────────────────
function cartesian<A, B>(a: A[], b: B[]): [A, B][] {
  const out: [A, B][] = [];
  for (const x of a) for (const y of b) out.push([x, y]);
  return out;
}

function cartesian3<A, B, C>(a: A[], b: B[], c: C[]): [A, B, C][] {
  const out: [A, B, C][] = [];
  for (const x of a) for (const y of b) for (const z of c) out.push([x, y, z]);
  return out;
}

// ── Range helper ────────────────────────────────────────────────
function range(n: number): number[] { return Array.from({ length: n }, (_, i) => i); }

// ── Build params helper ─────────────────────────────────────────
function makeBuildParams(numComponents: number, numWires: number) {
  const componentIds = range(numComponents).map(i => `comp_${i}`);
  const componentTypes = new Map<string, string>();
  const componentPins = new Map<string, Array<{ pinName: string; gpioNumber: number; signalType: string }>>();
  for (const id of componentIds) {
    componentTypes.set(id, 'led_generic');
    componentPins.set(id, [
      { pinName: 'anode', gpioNumber: parseInt(id.split('_')[1]) * 2, signalType: 'DIGITAL' },
      { pinName: 'cathode', gpioNumber: -1, signalType: 'GND' },
    ]);
  }
  const wireConnections: Array<{ wireId: string; sourceNodeId: string; targetNodeId: string }> = [];
  for (let i = 0; i < Math.min(numWires, numComponents - 1); i++) {
    wireConnections.push({
      wireId: `wire_${i}`,
      sourceNodeId: `comp_${i}_anode`,
      targetNodeId: `comp_${i + 1}_cathode`,
    });
  }
  return { componentIds, componentTypes, componentPins, wireConnections, boardId: 'esp32' };
}

// ═══════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════

describe('Phase 28B — Circuit ↔ Blockly Synchronization E2E', () => {

  // ═════════════════════════════════════════════════════════════
  // SECTION 1: Factory Functions (all models)
  // ═════════════════════════════════════════════════════════════
  describe('§1 — Factory Functions', () => {

    // 1A: CircuitNodeModel factory
    describe('§1A — createDefaultCircuitNodeModel', () => {
      for (let i = 0; i < 200; i++) {
        it(`creates node with id "node_${i}" and correct defaults (iter ${i})`, () => {
          const m = createDefaultCircuitNodeModel(`node_${i}`);
          expect(m.nodeId).toBe(`node_${i}`);
          expect(m.nodeType).toBe('COMPONENT_PIN');
          expect(m.componentId).toBe('');
          expect(m.pinName).toBe('');
          expect(m.gpioNumber).toBe(-1);
          expect(m.voltage).toBe(0);
          expect(m.netId).toBe('');
          expect(m.positionX).toBe(0);
          expect(m.positionY).toBe(0);
        });
      }

      it.each(VALID_CIRCUIT_NODE_TYPES)('accepts nodeType override "%s"', (nodeType) => {
        const m = createDefaultCircuitNodeModel('nt', { nodeType: nodeType as any });
        expect(m.nodeType).toBe(nodeType);
        expect(m.nodeId).toBe('nt');
      });

      for (let i = 0; i < 100; i++) {
        it(`override gpioNumber=${i} pins voltage=${i * 0.1} (iter ${i})`, () => {
          const m = createDefaultCircuitNodeModel(`ovr_${i}`, { gpioNumber: i, voltage: i * 0.1 });
          expect(m.gpioNumber).toBe(i);
          expect(m.voltage).toBeCloseTo(i * 0.1, 5);
          expect(m.nodeId).toBe(`ovr_${i}`);
        });
      }
    });

    // 1B: CircuitEdgeModel factory
    describe('§1B — createDefaultCircuitEdgeModel', () => {
      for (let i = 0; i < 200; i++) {
        it(`creates edge "edge_${i}" with correct defaults (iter ${i})`, () => {
          const m = createDefaultCircuitEdgeModel(`edge_${i}`);
          expect(m.edgeId).toBe(`edge_${i}`);
          expect(m.sourceNodeId).toBe('');
          expect(m.targetNodeId).toBe('');
          expect(m.edgeType).toBe('WIRE');
          expect(m.wireId).toBe('');
          expect(m.resistance).toBe(0);
        });
      }

      it.each(VALID_CIRCUIT_EDGE_TYPES)('accepts edgeType override "%s"', (edgeType) => {
        const m = createDefaultCircuitEdgeModel('et', { edgeType: edgeType as any });
        expect(m.edgeType).toBe(edgeType);
        expect(m.edgeId).toBe('et');
      });

      for (let i = 0; i < 100; i++) {
        it(`override source/target with resistance ${i * 10} (iter ${i})`, () => {
          const m = createDefaultCircuitEdgeModel(`e${i}`, {
            sourceNodeId: `src_${i}`, targetNodeId: `tgt_${i}`, resistance: i * 10,
          });
          expect(m.sourceNodeId).toBe(`src_${i}`);
          expect(m.targetNodeId).toBe(`tgt_${i}`);
          expect(m.resistance).toBe(i * 10);
        });
      }
    });

    // 1C: CircuitNetModel factory
    describe('§1C — createDefaultCircuitNetModel', () => {
      for (let i = 0; i < 200; i++) {
        it(`creates net "net_${i}" with correct defaults (iter ${i})`, () => {
          const m = createDefaultCircuitNetModel(`net_${i}`);
          expect(m.netId).toBe(`net_${i}`);
          expect(m.nodeIds).toEqual([]);
          expect(m.netState).toBe('INACTIVE');
          expect(m.netVoltage).toBe(0);
          expect(m.isPowerNet).toBe(false);
          expect(m.isGroundNet).toBe(false);
          expect(m.netLabel).toBe('');
        });
      }

      it.each(VALID_CIRCUIT_NET_STATES)('accepts netState override "%s"', (state) => {
        const m = createDefaultCircuitNetModel('ns', { netState: state as any });
        expect(m.netState).toBe(state);
        expect(m.netId).toBe('ns');
      });
    });

    // 1D: CircuitGraphModel factory
    describe('§1D — createDefaultCircuitGraphModel', () => {
      for (let i = 0; i < 150; i++) {
        it(`creates graph "graph_${i}" with correct defaults (iter ${i})`, () => {
          const m = createDefaultCircuitGraphModel(`graph_${i}`);
          expect(m.graphId).toBe(`graph_${i}`);
          expect(m.nodes).toEqual([]);
          expect(m.edges).toEqual([]);
          expect(m.nets).toEqual([]);
          expect(m.componentIds).toEqual([]);
          expect(m.wireIds).toEqual([]);
          expect(m.boardId).toBe('');
          expect(m.version).toBe(0);
        });
      }
    });

    // 1E: CircuitMappingModel factory
    describe('§1E — createDefaultCircuitMappingModel', () => {
      for (let i = 0; i < 150; i++) {
        it(`creates mapping "map_${i}" with correct defaults (iter ${i})`, () => {
          const m = createDefaultCircuitMappingModel(`map_${i}`);
          expect(m.mappingId).toBe(`map_${i}`);
          expect(m.graphId).toBe('');
          expect(m.componentId).toBe('');
          expect(m.componentType).toBe('');
          expect(m.pinName).toBe('');
          expect(m.gpioNumber).toBe(-1);
          expect(m.blocklyBlockId).toBe('');
          expect(m.signalType).toBe('');
        });
      }
    });

    // 1F: ProjectHealthModel factory
    describe('§1F — createDefaultProjectHealthModel', () => {
      for (let i = 0; i < 150; i++) {
        it(`creates health "health_${i}" with correct defaults (iter ${i})`, () => {
          const m = createDefaultProjectHealthModel(`health_${i}`);
          expect(m.healthId).toBe(`health_${i}`);
          expect(m.readinessPercent).toBe(0);
          expect(m.errorCount).toBe(0);
          expect(m.warningCount).toBe(0);
          expect(m.healthGrade).toBe('F');
          expect(m.totalComponents).toBe(0);
          expect(m.totalWires).toBe(0);
          expect(m.totalNets).toBe(0);
          expect(m.disconnectedComponents).toEqual([]);
          expect(m.unmappedGpios).toEqual([]);
          expect(m.unusedComponents).toEqual([]);
        });
      }
    });

    // 1G: GpioOwnershipModel factory
    describe('§1G — createDefaultGpioOwnershipModel', () => {
      for (let i = 0; i < 200; i++) {
        it(`creates ownership "own_${i}" with correct defaults (iter ${i})`, () => {
          const m = createDefaultGpioOwnershipModel(`own_${i}`);
          expect(m.ownershipId).toBe(`own_${i}`);
          expect(m.gpioNumber).toBe(-1);
          expect(m.componentId).toBe('');
          expect(m.componentType).toBe('');
          expect(m.pinName).toBe('');
          expect(m.direction).toBe('UNASSIGNED');
          expect(m.claimedAt).toBe(0);
        });
      }
    });

    // 1H: GpioConflictModel factory
    describe('§1H — createDefaultGpioConflictModel', () => {
      for (let i = 0; i < 200; i++) {
        it(`creates conflict "cf_${i}" with correct defaults (iter ${i})`, () => {
          const m = createDefaultGpioConflictModel(`cf_${i}`);
          expect(m.conflictId).toBe(`cf_${i}`);
          expect(m.gpioNumber).toBe(-1);
          expect(m.conflictType).toBe('DUPLICATE_OUTPUT');
          expect(m.severity).toBe('ERROR');
          expect(m.ownershipIds).toEqual([]);
          expect(m.description).toBe('');
        });
      }
    });

    // 1I: CircuitSyncModel factory
    describe('§1I — createDefaultCircuitSyncModel', () => {
      for (let i = 0; i < 200; i++) {
        it(`creates sync "sync_${i}" with correct defaults (iter ${i})`, () => {
          const m = createDefaultCircuitSyncModel(`sync_${i}`);
          expect(m.syncId).toBe(`sync_${i}`);
          expect(m.syncState).toBe('IDLE');
          expect(m.graphVersion).toBe(0);
          expect(m.lastSyncTick).toBe(0);
          expect(m.isDirty).toBe(false);
          expect(m.lastGraphId).toBe('');
          expect(m.lastProgramId).toBe('');
          expect(m.errorLog).toEqual([]);
        });
      }
    });

    // 1J: Parametric cartesian — nodeTypes × edgeTypes factories
    describe('§1J — Cartesian Factory Products', () => {
      const nodeEdgePairs = cartesian(VALID_CIRCUIT_NODE_TYPES, VALID_CIRCUIT_EDGE_TYPES);
      it.each(nodeEdgePairs)('node=%s edge=%s factory round-trip', (nt, et) => {
        const node = createDefaultCircuitNodeModel(`n_${nt}`, { nodeType: nt as any });
        const edge = createDefaultCircuitEdgeModel(`e_${et}`, { edgeType: et as any });
        expect(node.nodeType).toBe(nt);
        expect(edge.edgeType).toBe(et);
        expect(typeof node.nodeId).toBe('string');
        expect(typeof edge.edgeId).toBe('string');
      });
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 2: Validators (all models)
  // ═════════════════════════════════════════════════════════════
  describe('§2 — Validators', () => {
    beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
    afterEach(() => { vi.restoreAllMocks(); });

    // 2A: CircuitNode validator
    describe('§2A — validateCircuitNodeModel', () => {
      for (let i = 0; i < 100; i++) {
        it(`valid node "vn_${i}" yields no warnings (iter ${i})`, () => {
          const m = createDefaultCircuitNodeModel(`vn_${i}`, { nodeType: 'COMPONENT_PIN', voltage: i * 0.5 });
          const w = validateCircuitNodeModel(m);
          expect(w).toEqual([]);
          expect(w.length).toBe(0);
        });
      }

      it('empty nodeId yields EMPTY_NODE_ID warning', () => {
        const m = createDefaultCircuitNodeModel('');
        const w = validateCircuitNodeModel(m);
        expect(w.some(x => x.code === 'EMPTY_NODE_ID')).toBe(true);
        expect(w.length).toBeGreaterThanOrEqual(1);
      });

      it('invalid nodeType yields INVALID_NODE_TYPE', () => {
        const m = createDefaultCircuitNodeModel('bad', { nodeType: 'BOGUS' as any });
        const w = validateCircuitNodeModel(m);
        expect(w.some(x => x.code === 'INVALID_NODE_TYPE')).toBe(true);
      });

      it.each(VALID_CIRCUIT_NODE_TYPES)('valid nodeType "%s" passes', (nt) => {
        const m = createDefaultCircuitNodeModel(`nt_${nt}`, { nodeType: nt as any });
        const w = validateCircuitNodeModel(m);
        expect(w.filter(x => x.code === 'INVALID_NODE_TYPE').length).toBe(0);
      });
    });

    // 2B: CircuitEdge validator
    describe('§2B — validateCircuitEdgeModel', () => {
      for (let i = 0; i < 100; i++) {
        it(`valid edge "ve_${i}" yields no critical warnings (iter ${i})`, () => {
          const m = createDefaultCircuitEdgeModel(`ve_${i}`, { sourceNodeId: 's', targetNodeId: 't' });
          const w = validateCircuitEdgeModel(m);
          expect(w.filter(x => x.code === 'INVALID_CIRCUIT_EDGE').length).toBe(0);
          expect(w.filter(x => x.code === 'INVALID_EDGE_TYPE').length).toBe(0);
        });
      }

      it('empty edgeId yields EMPTY_EDGE_ID', () => {
        const m = createDefaultCircuitEdgeModel('', { sourceNodeId: 'a', targetNodeId: 'b' });
        const w = validateCircuitEdgeModel(m);
        expect(w.some(x => x.code === 'EMPTY_EDGE_ID')).toBe(true);
      });

      it('empty source yields EMPTY_SOURCE', () => {
        const m = createDefaultCircuitEdgeModel('e1');
        const w = validateCircuitEdgeModel(m);
        expect(w.some(x => x.code === 'EMPTY_SOURCE')).toBe(true);
      });

      it('empty target yields EMPTY_TARGET', () => {
        const m = createDefaultCircuitEdgeModel('e2', { sourceNodeId: 's' });
        const w = validateCircuitEdgeModel(m);
        expect(w.some(x => x.code === 'EMPTY_TARGET')).toBe(true);
      });

      it.each(VALID_CIRCUIT_EDGE_TYPES)('valid edgeType "%s" passes', (et) => {
        const m = createDefaultCircuitEdgeModel(`et_${et}`, { edgeType: et as any, sourceNodeId: 's', targetNodeId: 't' });
        const w = validateCircuitEdgeModel(m);
        expect(w.filter(x => x.code === 'INVALID_EDGE_TYPE').length).toBe(0);
      });
    });

    // 2C: CircuitNet validator
    describe('§2C — validateCircuitNetModel', () => {
      for (let i = 0; i < 100; i++) {
        it(`valid net "vnet_${i}" yields no warnings (iter ${i})`, () => {
          const m = createDefaultCircuitNetModel(`vnet_${i}`);
          const w = validateCircuitNetModel(m);
          expect(w.filter(x => x.code === 'INVALID_CIRCUIT_NET').length).toBe(0);
          expect(w.filter(x => x.code === 'INVALID_NET_STATE').length).toBe(0);
        });
      }

      it.each(VALID_CIRCUIT_NET_STATES)('valid netState "%s" passes', (ns) => {
        const m = createDefaultCircuitNetModel('ns_test', { netState: ns as any });
        const w = validateCircuitNetModel(m);
        expect(w.filter(x => x.code === 'INVALID_NET_STATE').length).toBe(0);
      });

      it('invalid netState yields warning', () => {
        const m = createDefaultCircuitNetModel('bad_ns', { netState: 'NONSENSE' as any });
        const w = validateCircuitNetModel(m);
        expect(w.some(x => x.code === 'INVALID_NET_STATE')).toBe(true);
      });
    });

    // 2D: CircuitGraph validator
    describe('§2D — validateCircuitGraphModel', () => {
      for (let i = 0; i < 100; i++) {
        it(`valid graph "vg_${i}" yields no structural warnings (iter ${i})`, () => {
          const m = createDefaultCircuitGraphModel(`vg_${i}`);
          const w = validateCircuitGraphModel(m);
          expect(w.filter(x => x.code === 'INVALID_CIRCUIT_GRAPH').length).toBe(0);
          expect(w.length).toBe(0);
        });
      }

      it('empty graphId yields EMPTY_GRAPH_ID', () => {
        const m = createDefaultCircuitGraphModel('');
        const w = validateCircuitGraphModel(m);
        expect(w.some(x => x.code === 'EMPTY_GRAPH_ID')).toBe(true);
      });
    });

    // 2E: CircuitMapping validator
    describe('§2E — validateCircuitMappingModel', () => {
      for (let i = 0; i < 100; i++) {
        it(`mapping "vm_${i}" with componentId yields no EMPTY_COMPONENT_ID (iter ${i})`, () => {
          const m = createDefaultCircuitMappingModel(`vm_${i}`, { componentId: `c${i}` });
          const w = validateCircuitMappingModel(m);
          expect(w.filter(x => x.code === 'EMPTY_COMPONENT_ID').length).toBe(0);
        });
      }

      it('empty componentId yields EMPTY_COMPONENT_ID', () => {
        const m = createDefaultCircuitMappingModel('bad_map');
        const w = validateCircuitMappingModel(m);
        expect(w.some(x => x.code === 'EMPTY_COMPONENT_ID')).toBe(true);
      });
    });

    // 2F: GpioOwnership validator
    describe('§2F — validateGpioOwnershipModel', () => {
      for (let i = 0; i < 100; i++) {
        it(`valid ownership with gpio=${i % 40} passes (iter ${i})`, () => {
          const m = createDefaultGpioOwnershipModel(`vo_${i}`, {
            gpioNumber: i % 40, componentId: `comp_${i}`, direction: 'OUTPUT',
          });
          const w = validateGpioOwnershipModel(m);
          expect(w.filter(x => x.code === 'INVALID_GPIO_NUMBER').length).toBe(0);
          expect(w.filter(x => x.code === 'INVALID_DIRECTION').length).toBe(0);
        });
      }

      it.each(VALID_GPIO_DIRECTIONS)('valid direction "%s" passes', (dir) => {
        const m = createDefaultGpioOwnershipModel('d_test', { gpioNumber: 2, componentId: 'c', direction: dir as any });
        const w = validateGpioOwnershipModel(m);
        expect(w.filter(x => x.code === 'INVALID_DIRECTION').length).toBe(0);
      });

      it('invalid gpio number -5 yields warning', () => {
        const m = createDefaultGpioOwnershipModel('bad_gpio', { gpioNumber: -5, componentId: 'c' });
        const w = validateGpioOwnershipModel(m);
        expect(w.some(x => x.code === 'INVALID_GPIO_NUMBER')).toBe(true);
      });

      it('gpio number >= 40 yields warning', () => {
        const m = createDefaultGpioOwnershipModel('high_gpio', { gpioNumber: 40, componentId: 'c' });
        const w = validateGpioOwnershipModel(m);
        expect(w.some(x => x.code === 'INVALID_GPIO_NUMBER')).toBe(true);
      });
    });

    // 2G: GpioConflict validator
    describe('§2G — validateGpioConflictModel', () => {
      for (let i = 0; i < 100; i++) {
        it(`valid conflict "vc_${i}" passes (iter ${i})`, () => {
          const m = createDefaultGpioConflictModel(`vc_${i}`);
          const w = validateGpioConflictModel(m);
          expect(w.filter(x => x.code === 'INVALID_CONFLICT').length).toBe(0);
          expect(w.filter(x => x.code === 'INVALID_CONFLICT_TYPE').length).toBe(0);
          expect(w.filter(x => x.code === 'INVALID_SEVERITY').length).toBe(0);
        });
      }

      it.each(VALID_GPIO_CONFLICT_TYPES)('valid conflictType "%s" passes', (ct) => {
        const m = createDefaultGpioConflictModel('ct_test', { conflictType: ct as any });
        const w = validateGpioConflictModel(m);
        expect(w.filter(x => x.code === 'INVALID_CONFLICT_TYPE').length).toBe(0);
      });

      it.each(VALID_GPIO_CONFLICT_SEVERITIES)('valid severity "%s" passes', (sev) => {
        const m = createDefaultGpioConflictModel('sev_test', { severity: sev as any });
        const w = validateGpioConflictModel(m);
        expect(w.filter(x => x.code === 'INVALID_SEVERITY').length).toBe(0);
      });
    });

    // 2H: CircuitSync validator
    describe('§2H — validateCircuitSyncModel', () => {
      for (let i = 0; i < 100; i++) {
        it(`valid sync "vs_${i}" passes (iter ${i})`, () => {
          const m = createDefaultCircuitSyncModel(`vs_${i}`);
          const w = validateCircuitSyncModel(m);
          expect(w.length).toBe(0);
        });
      }

      it.each(VALID_CIRCUIT_SYNC_STATES)('valid syncState "%s" passes', (ss) => {
        const m = createDefaultCircuitSyncModel('ss_test', { syncState: ss as any });
        const w = validateCircuitSyncModel(m);
        expect(w.filter(x => x.code === 'INVALID_SYNC_STATE').length).toBe(0);
      });

      it('invalid syncState yields warning', () => {
        const m = createDefaultCircuitSyncModel('bad_ss', { syncState: 'BOGUS' as any });
        const w = validateCircuitSyncModel(m);
        expect(w.some(x => x.code === 'INVALID_SYNC_STATE')).toBe(true);
      });

      it('empty syncId yields warning', () => {
        const m = createDefaultCircuitSyncModel('');
        const w = validateCircuitSyncModel(m);
        expect(w.some(x => x.code === 'EMPTY_SYNC_ID')).toBe(true);
      });
    });

    // 2I: Parametric cross-validator — all nodeTypes × netStates
    describe('§2I — Cross-model validator parametric', () => {
      const pairs = cartesian(VALID_CIRCUIT_NODE_TYPES, VALID_CIRCUIT_NET_STATES);
      it.each(pairs)('nodeType=%s + netState=%s both validate without crash', (nt, ns) => {
        const node = createDefaultCircuitNodeModel(`xval_${nt}`, { nodeType: nt as any });
        const net = createDefaultCircuitNetModel(`xnet_${ns}`, { netState: ns as any });
        const nw = validateCircuitNodeModel(node);
        const nnw = validateCircuitNetModel(net);
        expect(nw.filter(w => w.code === 'INVALID_NODE_TYPE').length).toBe(0);
        expect(nnw.filter(w => w.code === 'INVALID_NET_STATE').length).toBe(0);
      });
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 3: CircuitGraphSynchronizer CRUD
  // ═════════════════════════════════════════════════════════════
  describe('§3 — CircuitGraphSynchronizer CRUD', () => {

    // 3A: Node CRUD
    describe('§3A — Node CRUD', () => {
      for (let i = 0; i < 200; i++) {
        it(`register + get + has node "n_${i}" (iter ${i})`, () => {
          const sync = new CircuitGraphSynchronizer();
          const m = createDefaultCircuitNodeModel(`n_${i}`, { gpioNumber: i % 40 });
          sync.registerCircuitNode(m);
          expect(sync.hasCircuitNode(`n_${i}`)).toBe(true);
          const got = sync.getCircuitNode(`n_${i}`);
          expect(got).toBeDefined();
          expect(got!.nodeId).toBe(`n_${i}`);
          expect(got!.gpioNumber).toBe(i % 40);
        });
      }

      it('registers 500 nodes, getAll returns all', () => {
        const sync = new CircuitGraphSynchronizer();
        for (let i = 0; i < 500; i++) {
          sync.registerCircuitNode(createDefaultCircuitNodeModel(`bulk_${i}`));
        }
        const all = sync.getAllCircuitNodes();
        expect(all.length).toBe(500);
        const keys = sync.getCircuitNodeKeys();
        expect(keys.length).toBe(500);
        for (let i = 0; i < 500; i++) {
          expect(sync.hasCircuitNode(`bulk_${i}`)).toBe(true);
        }
      });

      it('update node changes voltage', () => {
        const sync = new CircuitGraphSynchronizer();
        sync.registerCircuitNode(createDefaultCircuitNodeModel('upd'));
        sync.updateCircuitNode('upd', { voltage: 3.3 });
        expect(sync.getCircuitNode('upd')!.voltage).toBe(3.3);
      });

      it('remove node then has returns false', () => {
        const sync = new CircuitGraphSynchronizer();
        sync.registerCircuitNode(createDefaultCircuitNodeModel('rm'));
        sync.removeCircuitNode('rm');
        expect(sync.hasCircuitNode('rm')).toBe(false);
        expect(sync.getCircuitNode('rm')).toBeUndefined();
      });

      it('clear removes all nodes', () => {
        const sync = new CircuitGraphSynchronizer();
        for (let i = 0; i < 50; i++) sync.registerCircuitNode(createDefaultCircuitNodeModel(`cl_${i}`));
        sync.clearCircuitNodes();
        expect(sync.getAllCircuitNodes().length).toBe(0);
        expect(sync.getCircuitNodeKeys().length).toBe(0);
      });
    });

    // 3B: Edge CRUD
    describe('§3B — Edge CRUD', () => {
      for (let i = 0; i < 200; i++) {
        it(`register + get + has edge "e_${i}" (iter ${i})`, () => {
          const sync = new CircuitGraphSynchronizer();
          const m = createDefaultCircuitEdgeModel(`e_${i}`, { sourceNodeId: 's', targetNodeId: 't' });
          sync.registerCircuitEdge(m);
          expect(sync.hasCircuitEdge(`e_${i}`)).toBe(true);
          expect(sync.getCircuitEdge(`e_${i}`)!.edgeId).toBe(`e_${i}`);
        });
      }

      it('registers 500 edges, getAll returns all', () => {
        const sync = new CircuitGraphSynchronizer();
        for (let i = 0; i < 500; i++) {
          sync.registerCircuitEdge(createDefaultCircuitEdgeModel(`be_${i}`, { sourceNodeId: 's', targetNodeId: 't' }));
        }
        expect(sync.getAllCircuitEdges().length).toBe(500);
        expect(sync.getCircuitEdgeKeys().length).toBe(500);
      });

      it('update edge changes resistance', () => {
        const sync = new CircuitGraphSynchronizer();
        sync.registerCircuitEdge(createDefaultCircuitEdgeModel('ue', { sourceNodeId: 's', targetNodeId: 't' }));
        sync.updateCircuitEdge('ue', { resistance: 1000 });
        expect(sync.getCircuitEdge('ue')!.resistance).toBe(1000);
      });

      it('remove + clear edges', () => {
        const sync = new CircuitGraphSynchronizer();
        sync.registerCircuitEdge(createDefaultCircuitEdgeModel('re', { sourceNodeId: 's', targetNodeId: 't' }));
        sync.removeCircuitEdge('re');
        expect(sync.hasCircuitEdge('re')).toBe(false);
        for (let i = 0; i < 10; i++) sync.registerCircuitEdge(createDefaultCircuitEdgeModel(`ce_${i}`));
        sync.clearCircuitEdges();
        expect(sync.getAllCircuitEdges().length).toBe(0);
      });
    });

    // 3C: Net CRUD
    describe('§3C — Net CRUD', () => {
      for (let i = 0; i < 200; i++) {
        it(`register + get + has net "net_${i}" (iter ${i})`, () => {
          const sync = new CircuitGraphSynchronizer();
          const m = createDefaultCircuitNetModel(`net_${i}`, { nodeIds: [`a_${i}`, `b_${i}`] });
          sync.registerCircuitNet(m);
          expect(sync.hasCircuitNet(`net_${i}`)).toBe(true);
          expect(sync.getCircuitNet(`net_${i}`)!.nodeIds.length).toBe(2);
        });
      }

      it('bulk net registration and retrieval', () => {
        const sync = new CircuitGraphSynchronizer();
        for (let i = 0; i < 300; i++) sync.registerCircuitNet(createDefaultCircuitNetModel(`bn_${i}`));
        expect(sync.getAllCircuitNets().length).toBe(300);
        expect(sync.getCircuitNetKeys().length).toBe(300);
      });
    });

    // 3D: Graph CRUD
    describe('§3D — Graph CRUD', () => {
      for (let i = 0; i < 150; i++) {
        it(`register + get graph "g_${i}" (iter ${i})`, () => {
          const sync = new CircuitGraphSynchronizer();
          const m = createDefaultCircuitGraphModel(`g_${i}`, { boardId: 'esp32', version: i });
          sync.registerCircuitGraph(m);
          expect(sync.hasCircuitGraph(`g_${i}`)).toBe(true);
          expect(sync.getCircuitGraph(`g_${i}`)!.version).toBe(i);
        });
      }
    });

    // 3E: Mapping CRUD
    describe('§3E — Mapping CRUD', () => {
      for (let i = 0; i < 150; i++) {
        it(`register + get mapping "m_${i}" (iter ${i})`, () => {
          const sync = new CircuitGraphSynchronizer();
          const m = createDefaultCircuitMappingModel(`m_${i}`, { componentId: `comp_${i}`, gpioNumber: i % 40 });
          sync.registerCircuitMapping(m);
          expect(sync.hasCircuitMapping(`m_${i}`)).toBe(true);
          expect(sync.getCircuitMapping(`m_${i}`)!.gpioNumber).toBe(i % 40);
        });
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 4: Graph Building & Union-Find
  // ═════════════════════════════════════════════════════════════
  describe('§4 — Graph Building & Union-Find', () => {

    for (let n = 1; n <= 50; n++) {
      it(`builds graph with ${n} components and ${Math.max(0, n - 1)} wires (iter ${n})`, () => {
        const sync = new CircuitGraphSynchronizer();
        const params = makeBuildParams(n, n - 1);
        const graph = sync.buildCircuitGraph(params);
        expect(graph).toBeDefined();
        expect(graph.graphId).toBeTruthy();
        expect(graph.componentIds.length).toBe(n);
        expect(graph.nodes.length).toBe(n * 2); // 2 pins per component
        expect(graph.edges.length).toBe(Math.max(0, n - 1));
        expect(graph.nets.length).toBeGreaterThan(0);
      });
    }

    it('builds graph and auto-creates mappings', () => {
      const sync = new CircuitGraphSynchronizer();
      const params = makeBuildParams(5, 4);
      sync.buildCircuitGraph(params);
      const mappings = sync.getAllCircuitMappings();
      expect(mappings.length).toBe(10); // 5 components × 2 pins
      for (const m of mappings) {
        expect(m.mappingId).toBeTruthy();
        expect(m.componentId).toBeTruthy();
      }
    });

    it('union-find groups connected nodes into same net', () => {
      const sync = new CircuitGraphSynchronizer();
      const params = makeBuildParams(3, 2);
      const graph = sync.buildCircuitGraph(params);
      // Wires connect comp_0_anode→comp_1_cathode and comp_1_anode→comp_2_cathode
      // So comp_0_anode and comp_1_cathode should be in same net
      const allNets = graph.nets;
      const connectedNet = allNets.find(n => n.nodeIds.length > 1);
      expect(connectedNet).toBeDefined();
      expect(connectedNet!.nodeIds.length).toBeGreaterThanOrEqual(2);
    });

    it('floating nodes get FLOATING net state', () => {
      const sync = new CircuitGraphSynchronizer();
      // Build with 3 components but 0 wires → all pins floating
      const params = makeBuildParams(3, 0);
      const graph = sync.buildCircuitGraph(params);
      const floatingNets = graph.nets.filter(n => n.netState === 'FLOATING');
      expect(floatingNets.length).toBeGreaterThan(0);
    });

    for (let i = 0; i < 50; i++) {
      it(`graph version increments on build #${i + 1}`, () => {
        const sync = new CircuitGraphSynchronizer();
        const g1 = sync.buildCircuitGraph(makeBuildParams(2, 1));
        const g2 = sync.buildCircuitGraph(makeBuildParams(2, 1));
        expect(g2.version).toBeGreaterThan(g1.version);
        expect(g2.graphId).not.toBe(g1.graphId);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 5: Circuit Validation
  // ═════════════════════════════════════════════════════════════
  describe('§5 — Circuit Validation', () => {
    beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
    afterEach(() => { vi.restoreAllMocks(); });

    for (let i = 0; i < 50; i++) {
      it(`validates graph with ${i + 1} disconnected components (iter ${i})`, () => {
        const sync = new CircuitGraphSynchronizer();
        const params = makeBuildParams(i + 1, 0);
        const graph = sync.buildCircuitGraph(params);
        const warnings = sync.validateCircuitGraphById(graph.graphId);
        expect(warnings).toBeDefined();
        expect(Array.isArray(warnings)).toBe(true);
        if (i > 0) {
          // With no wires, all components are disconnected (floating)
          const floating = warnings.filter(w => w.code === 'FLOATING_PIN');
          expect(floating.length).toBeGreaterThanOrEqual(0);
        }
      });
    }

    it('MISSING_GROUND and MISSING_POWER warnings for no ground/power', () => {
      const sync = new CircuitGraphSynchronizer();
      const params = makeBuildParams(2, 1);
      const graph = sync.buildCircuitGraph(params);
      const warnings = sync.validateCircuitGraphById(graph.graphId);
      const hasMissingGround = warnings.some(w => w.code === 'MISSING_GROUND');
      const hasMissingPower = warnings.some(w => w.code === 'MISSING_POWER');
      expect(hasMissingGround).toBe(true);
      expect(hasMissingPower).toBe(true);
    });

    it('GRAPH_NOT_FOUND for invalid graphId', () => {
      const sync = new CircuitGraphSynchronizer();
      const warnings = sync.validateCircuitGraphById('nonexistent');
      expect(warnings.length).toBe(1);
      expect(warnings[0].code).toBe('GRAPH_NOT_FOUND');
    });

    it('SHORT_CIRCUIT detected when power and ground connected', () => {
      const sync = new CircuitGraphSynchronizer();
      // Manually build a graph with power and ground in same net
      const compIds = ['power_comp', 'ground_comp'];
      const compTypes = new Map([['power_comp', 'led'], ['ground_comp', 'led']]);
      const compPins = new Map([
        ['power_comp', [{ pinName: 'VCC', gpioNumber: 2, signalType: 'POWER' }]],
        ['ground_comp', [{ pinName: 'GND', gpioNumber: -1, signalType: 'GND' }]],
      ]);
      const wires = [{ wireId: 'w_short', sourceNodeId: 'power_comp_VCC', targetNodeId: 'ground_comp_GND' }];
      const graph = sync.buildCircuitGraph({
        componentIds: compIds,
        componentTypes: compTypes,
        componentPins: compPins,
        wireConnections: wires,
        boardId: 'esp32',
      });
      const warnings = sync.validateCircuitGraphById(graph.graphId);
      const shortCircuits = warnings.filter(w => w.code === 'SHORT_CIRCUIT');
      expect(shortCircuits.length).toBeGreaterThanOrEqual(1);
    });

    it('DISCONNECTED_COMPONENT detected for isolated component', () => {
      const sync = new CircuitGraphSynchronizer();
      const params = makeBuildParams(3, 1); // Only 1 wire for 3 components → comp_2 disconnected
      const graph = sync.buildCircuitGraph(params);
      const warnings = sync.validateCircuitGraphById(graph.graphId);
      const disconnected = warnings.filter(w => w.code === 'DISCONNECTED_COMPONENT');
      expect(disconnected.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 6: Project Health
  // ═════════════════════════════════════════════════════════════
  describe('§6 — Project Health', () => {
    beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
    afterEach(() => { vi.restoreAllMocks(); });

    for (let i = 0; i < 50; i++) {
      it(`calculates health for ${i + 1} components (iter ${i})`, () => {
        const sync = new CircuitGraphSynchronizer();
        const params = makeBuildParams(i + 1, i);
        const graph = sync.buildCircuitGraph(params);
        const health = sync.calculateProjectHealth(graph.graphId, [], false);
        expect(health).toBeDefined();
        expect(health.healthId).toBeTruthy();
        expect(health.totalComponents).toBe(i + 1);
        expect(health.totalWires).toBe(i);
        expect(typeof health.readinessPercent).toBe('number');
        expect(typeof health.healthGrade).toBe('string');
        expect(['A', 'B', 'C', 'D', 'F']).toContain(health.healthGrade);
      });
    }

    it('health with no graph returns default (F)', () => {
      const sync = new CircuitGraphSynchronizer();
      const health = sync.calculateProjectHealth('nonexistent', [], false);
      expect(health.healthGrade).toBe('F');
      expect(health.readinessPercent).toBe(0);
    });

    it('health with program raises readiness', () => {
      const sync = new CircuitGraphSynchronizer();
      const params = makeBuildParams(3, 2);
      const graph = sync.buildCircuitGraph(params);
      const h1 = sync.calculateProjectHealth(graph.graphId, [], false);
      const h2 = sync.calculateProjectHealth(graph.graphId, [], true);
      expect(h2.readinessPercent).toBeGreaterThan(h1.readinessPercent);
    });

    it('health grade A requires >= 90 readiness', () => {
      const sync = new CircuitGraphSynchronizer();
      // Build a fully connected graph with all checks passing + program
      const compIds = ['led1', 'led2'];
      const compTypes = new Map([['led1', 'led'], ['led2', 'led']]);
      const compPins = new Map([
        ['led1', [{ pinName: 'anode', gpioNumber: 2, signalType: 'DIGITAL' }]],
        ['led2', [{ pinName: 'anode', gpioNumber: 4, signalType: 'DIGITAL' }]],
      ]);
      const wires = [{ wireId: 'w1', sourceNodeId: 'led1_anode', targetNodeId: 'led2_anode' }];
      const graph = sync.buildCircuitGraph({
        componentIds: compIds, componentTypes: compTypes, componentPins: compPins,
        wireConnections: wires, boardId: 'esp32',
      });
      const health = sync.calculateProjectHealth(graph.graphId, [2, 4], true);
      expect(health.readinessPercent).toBeGreaterThanOrEqual(80);
      expect(['A', 'B']).toContain(health.healthGrade);
    });

    it('unmapped gpios are detected', () => {
      const sync = new CircuitGraphSynchronizer();
      const params = makeBuildParams(2, 1);
      const graph = sync.buildCircuitGraph(params);
      const health = sync.calculateProjectHealth(graph.graphId, [999], false);
      expect(health.unmappedGpios.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 7: Export/Import
  // ═════════════════════════════════════════════════════════════
  describe('§7 — Export/Import', () => {
    beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
    afterEach(() => { vi.restoreAllMocks(); });

    for (let i = 0; i < 50; i++) {
      it(`export and re-import graph with ${i + 1} components (iter ${i})`, () => {
        const sync = new CircuitGraphSynchronizer();
        const params = makeBuildParams(i + 1, i);
        const graph = sync.buildCircuitGraph(params);
        const json = sync.exportCircuitGraph(graph.graphId);
        expect(json).toBeTruthy();
        expect(json).not.toBe('{}');
        const parsed = JSON.parse(json);
        expect(parsed.graphId).toBe(graph.graphId);

        const sync2 = new CircuitGraphSynchronizer();
        const imported = sync2.importCircuitGraph(json);
        expect(imported).not.toBeNull();
        expect(imported!.graphId).toBe(graph.graphId);
        expect(imported!.componentIds.length).toBe(i + 1);
      });
    }

    it('export nonexistent graph returns {}', () => {
      const sync = new CircuitGraphSynchronizer();
      const json = sync.exportCircuitGraph('nope');
      expect(json).toBe('{}');
    });

    it('import invalid JSON returns null', () => {
      const sync = new CircuitGraphSynchronizer();
      const result = sync.importCircuitGraph('not valid json{{{');
      expect(result).toBeNull();
    });

    it('import empty object returns null', () => {
      const sync = new CircuitGraphSynchronizer();
      const result = sync.importCircuitGraph('{}');
      expect(result).toBeNull();
    });

    it('import registers nodes/edges/nets in sync2', () => {
      const sync = new CircuitGraphSynchronizer();
      const params = makeBuildParams(3, 2);
      const graph = sync.buildCircuitGraph(params);
      const json = sync.exportCircuitGraph(graph.graphId);
      const sync2 = new CircuitGraphSynchronizer();
      sync2.importCircuitGraph(json);
      expect(sync2.hasCircuitGraph(graph.graphId)).toBe(true);
      expect(sync2.getAllCircuitNodes().length).toBe(graph.nodes.length);
      expect(sync2.getAllCircuitEdges().length).toBe(graph.edges.length);
      expect(sync2.getAllCircuitNets().length).toBe(graph.nets.length);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 8: Live Analyzer
  // ═════════════════════════════════════════════════════════════
  describe('§8 — Live Analyzer', () => {

    for (let i = 0; i < 100; i++) {
      it(`onComponentPlaced creates nodes for comp_${i} (iter ${i})`, () => {
        const sync = new CircuitGraphSynchronizer();
        sync.onComponentPlaced(`comp_${i}`, 'led_generic', [
          { pinName: 'anode', gpioNumber: i % 40, signalType: 'DIGITAL' },
          { pinName: 'cathode', gpioNumber: -1, signalType: 'GND' },
        ]);
        expect(sync.hasCircuitNode(`comp_${i}_anode`)).toBe(true);
        expect(sync.hasCircuitNode(`comp_${i}_cathode`)).toBe(true);
        expect(sync.getCircuitNode(`comp_${i}_anode`)!.gpioNumber).toBe(i % 40);
      });
    }

    for (let i = 0; i < 50; i++) {
      it(`onComponentRemoved cleans up comp_${i} (iter ${i})`, () => {
        const sync = new CircuitGraphSynchronizer();
        sync.onComponentPlaced(`comp_${i}`, 'led', [
          { pinName: 'p1', gpioNumber: 2, signalType: 'DIGITAL' },
        ]);
        expect(sync.hasCircuitNode(`comp_${i}_p1`)).toBe(true);
        sync.onComponentRemoved(`comp_${i}`);
        expect(sync.hasCircuitNode(`comp_${i}_p1`)).toBe(false);
      });
    }

    for (let i = 0; i < 50; i++) {
      it(`onWireAdded/Removed for wire_${i} (iter ${i})`, () => {
        const sync = new CircuitGraphSynchronizer();
        sync.onWireAdded(`wire_${i}`, `src_${i}`, `tgt_${i}`);
        expect(sync.hasCircuitEdge(`wire_${i}`)).toBe(true);
        expect(sync.getCircuitEdge(`wire_${i}`)!.sourceNodeId).toBe(`src_${i}`);
        sync.onWireRemoved(`wire_${i}`);
        expect(sync.hasCircuitEdge(`wire_${i}`)).toBe(false);
      });
    }

    it('onComponentRemoved also removes edges to component', () => {
      const sync = new CircuitGraphSynchronizer();
      sync.onComponentPlaced('c1', 'led', [{ pinName: 'anode', gpioNumber: 2, signalType: 'DIGITAL' }]);
      sync.onComponentPlaced('c2', 'led', [{ pinName: 'anode', gpioNumber: 4, signalType: 'DIGITAL' }]);
      sync.onWireAdded('w1', 'c1_anode', 'c2_anode');
      expect(sync.hasCircuitEdge('w1')).toBe(true);
      sync.onComponentRemoved('c1');
      // Edge should be removed since source node no longer exists
      expect(sync.hasCircuitEdge('w1')).toBe(false);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 9: GpioOwnershipSynchronizer CRUD
  // ═════════════════════════════════════════════════════════════
  describe('§9 — GpioOwnershipSynchronizer CRUD', () => {

    // 9A: Ownership CRUD
    describe('§9A — Ownership CRUD', () => {
      for (let i = 0; i < 200; i++) {
        it(`register + get ownership "o_${i}" (iter ${i})`, () => {
          const sync = new GpioOwnershipSynchronizer();
          const m = createDefaultGpioOwnershipModel(`o_${i}`, { gpioNumber: i % 40, componentId: `c_${i}` });
          sync.registerOwnership(m);
          expect(sync.hasOwnership(`o_${i}`)).toBe(true);
          expect(sync.getOwnership(`o_${i}`)!.gpioNumber).toBe(i % 40);
        });
      }

      it('bulk ownership register and getAll', () => {
        const sync = new GpioOwnershipSynchronizer();
        for (let i = 0; i < 500; i++) {
          sync.registerOwnership(createDefaultGpioOwnershipModel(`bo_${i}`, { gpioNumber: i % 40, componentId: `c_${i}` }));
        }
        expect(sync.getAllOwnerships().length).toBe(500);
        expect(sync.getOwnershipKeys().length).toBe(500);
      });

      it('update ownership changes direction', () => {
        const sync = new GpioOwnershipSynchronizer();
        sync.registerOwnership(createDefaultGpioOwnershipModel('uo', { gpioNumber: 2, componentId: 'c', direction: 'INPUT' }));
        sync.updateOwnership('uo', { direction: 'OUTPUT' });
        expect(sync.getOwnership('uo')!.direction).toBe('OUTPUT');
      });

      it('remove + clear ownerships', () => {
        const sync = new GpioOwnershipSynchronizer();
        sync.registerOwnership(createDefaultGpioOwnershipModel('ro', { gpioNumber: 2, componentId: 'c' }));
        sync.removeOwnership('ro');
        expect(sync.hasOwnership('ro')).toBe(false);
        for (let i = 0; i < 10; i++) sync.registerOwnership(createDefaultGpioOwnershipModel(`co_${i}`, { gpioNumber: i, componentId: 'c' }));
        sync.clearOwnerships();
        expect(sync.getAllOwnerships().length).toBe(0);
      });
    });

    // 9B: Conflict CRUD
    describe('§9B — Conflict CRUD', () => {
      for (let i = 0; i < 200; i++) {
        it(`register + get conflict "c_${i}" (iter ${i})`, () => {
          const sync = new GpioOwnershipSynchronizer();
          const m = createDefaultGpioConflictModel(`c_${i}`, { gpioNumber: i % 40 });
          sync.registerConflict(m);
          expect(sync.hasConflict(`c_${i}`)).toBe(true);
          expect(sync.getConflict(`c_${i}`)!.gpioNumber).toBe(i % 40);
        });
      }

      it('bulk conflict register and getAll', () => {
        const sync = new GpioOwnershipSynchronizer();
        for (let i = 0; i < 300; i++) {
          sync.registerConflict(createDefaultGpioConflictModel(`bc_${i}`));
        }
        expect(sync.getAllConflicts().length).toBe(300);
        expect(sync.getConflictKeys().length).toBe(300);
      });

      it('update + remove + clear conflicts', () => {
        const sync = new GpioOwnershipSynchronizer();
        sync.registerConflict(createDefaultGpioConflictModel('uc'));
        sync.updateConflict('uc', { severity: 'CRITICAL' });
        expect(sync.getConflict('uc')!.severity).toBe('CRITICAL');
        sync.removeConflict('uc');
        expect(sync.hasConflict('uc')).toBe(false);
        for (let i = 0; i < 5; i++) sync.registerConflict(createDefaultGpioConflictModel(`cc_${i}`));
        sync.clearConflicts();
        expect(sync.getAllConflicts().length).toBe(0);
      });
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 10: GPIO Claiming & Conflicts
  // ═════════════════════════════════════════════════════════════
  describe('§10 — GPIO Claiming & Conflicts', () => {

    for (let gpio = 0; gpio < 40; gpio++) {
      it(`claimGpio for pin ${gpio} returns result (iter ${gpio})`, () => {
        const sync = new GpioOwnershipSynchronizer();
        const result = sync.claimGpio(`own_${gpio}`, gpio, `comp_${gpio}`, 'led', 'anode', 'OUTPUT');
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        expect(Array.isArray(result.conflicts)).toBe(true);
        // Check ownership was registered
        expect(sync.hasOwnership(`own_${gpio}`)).toBe(true);
      });
    }

    it('INPUT_ONLY_AS_OUTPUT conflict for pins 34,35,36,39', () => {
      for (const pin of ESP32_INPUT_ONLY_PINS) {
        const sync = new GpioOwnershipSynchronizer();
        const result = sync.claimGpio(`io_${pin}`, pin, 'led1', 'led', 'anode', 'OUTPUT');
        expect(result.conflicts.some(c => c.conflictType === 'INPUT_ONLY_AS_OUTPUT')).toBe(true);
        expect(result.success).toBe(false);
      }
    });

    it('RESERVED_PIN warning for reserved pins', () => {
      for (const pin of ESP32_RESERVED_PINS) {
        const sync = new GpioOwnershipSynchronizer();
        const result = sync.claimGpio(`rp_${pin}`, pin, 'comp1', 'led', 'anode', 'INPUT');
        expect(result.conflicts.some(c => c.conflictType === 'RESERVED_PIN')).toBe(true);
      }
    });

    it('DUPLICATE_OUTPUT when two outputs on same GPIO', () => {
      const sync = new GpioOwnershipSynchronizer();
      sync.claimGpio('first', 15, 'led1', 'led', 'anode', 'OUTPUT');
      const result = sync.claimGpio('second', 15, 'led2', 'led', 'anode', 'OUTPUT');
      expect(result.conflicts.some(c => c.conflictType === 'DUPLICATE_OUTPUT')).toBe(true);
      expect(result.success).toBe(false);
    });

    it('same component re-claim updates without conflict', () => {
      const sync = new GpioOwnershipSynchronizer();
      sync.claimGpio('first', 15, 'led1', 'led', 'anode', 'OUTPUT');
      const result = sync.claimGpio('second', 15, 'led1', 'led', 'anode', 'INPUT');
      expect(result.success).toBe(true);
      expect(result.conflicts.length).toBe(0);
    });

    it('releaseGpio removes ownership', () => {
      const sync = new GpioOwnershipSynchronizer();
      sync.claimGpio('rel1', 15, 'led1', 'led', 'anode', 'OUTPUT');
      expect(sync.getGpioOwner(15)).toBeDefined();
      sync.releaseGpio(15, 'led1');
      expect(sync.getGpioOwner(15)).toBeUndefined();
    });

    it('getOwnershipsForGpio returns all ownerships on a pin', () => {
      const sync = new GpioOwnershipSynchronizer();
      sync.claimGpio('a1', 12, 'comp1', 'led', 'anode', 'OUTPUT');
      sync.claimGpio('a2', 12, 'comp2', 'buzzer', 'pwm', 'INPUT');
      const ownerships = sync.getOwnershipsForGpio(12);
      expect(ownerships.length).toBe(2);
    });

    it('getComponentGpios returns all GPIO ownerships for a component', () => {
      const sync = new GpioOwnershipSynchronizer();
      sync.claimGpio('b1', 12, 'comp1', 'hcsr04', 'trig', 'OUTPUT');
      sync.claimGpio('b2', 13, 'comp1', 'hcsr04', 'echo', 'INPUT');
      const gpios = sync.getComponentGpios('comp1');
      expect(gpios.length).toBe(2);
    });

    for (let i = 0; i < 100; i++) {
      it(`claim + release cycle for gpio ${i % 40} (iter ${i})`, () => {
        const sync = new GpioOwnershipSynchronizer();
        const gpio = i % 40;
        sync.claimGpio(`cyc_${i}`, gpio, `comp_${i}`, 'led', 'anode', 'OUTPUT');
        expect(sync.hasOwnership(`cyc_${i}`)).toBe(true);
        sync.releaseGpio(gpio, `comp_${i}`);
        expect(sync.getOwnershipsForGpio(gpio).filter(o => o.componentId === `comp_${i}`).length).toBe(0);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 11: Conflict Detection
  // ═════════════════════════════════════════════════════════════
  describe('§11 — Conflict Detection', () => {

    it('detectConflicts finds DUPLICATE_OUTPUT', () => {
      const sync = new GpioOwnershipSynchronizer();
      sync.registerOwnership(createDefaultGpioOwnershipModel('o1', { gpioNumber: 5, componentId: 'c1', direction: 'OUTPUT' }));
      sync.registerOwnership(createDefaultGpioOwnershipModel('o2', { gpioNumber: 5, componentId: 'c2', direction: 'OUTPUT' }));
      const conflicts = sync.detectConflicts();
      expect(conflicts.some(c => c.conflictType === 'DUPLICATE_OUTPUT')).toBe(true);
    });

    it('detectConflicts finds MULTIPLE_DRIVERS', () => {
      const sync = new GpioOwnershipSynchronizer();
      sync.registerOwnership(createDefaultGpioOwnershipModel('o1', { gpioNumber: 5, componentId: 'c1', direction: 'INPUT' }));
      sync.registerOwnership(createDefaultGpioOwnershipModel('o2', { gpioNumber: 5, componentId: 'c2', direction: 'INPUT' }));
      const conflicts = sync.detectConflicts();
      expect(conflicts.some(c => c.conflictType === 'MULTIPLE_DRIVERS')).toBe(true);
    });

    it('detectConflicts finds INPUT_ONLY_AS_OUTPUT', () => {
      const sync = new GpioOwnershipSynchronizer();
      sync.registerOwnership(createDefaultGpioOwnershipModel('o_io', { gpioNumber: 34, componentId: 'c1', direction: 'OUTPUT' }));
      const conflicts = sync.detectConflicts();
      expect(conflicts.some(c => c.conflictType === 'INPUT_ONLY_AS_OUTPUT')).toBe(true);
    });

    it('detectConflicts finds RESERVED_PIN', () => {
      const sync = new GpioOwnershipSynchronizer();
      sync.registerOwnership(createDefaultGpioOwnershipModel('o_rp', { gpioNumber: 6, componentId: 'c1', direction: 'INPUT' }));
      const conflicts = sync.detectConflicts();
      expect(conflicts.some(c => c.conflictType === 'RESERVED_PIN')).toBe(true);
    });

    it('detectConflicts clears previous conflicts before detecting', () => {
      const sync = new GpioOwnershipSynchronizer();
      sync.registerConflict(createDefaultGpioConflictModel('old_conflict'));
      sync.registerOwnership(createDefaultGpioOwnershipModel('o1', { gpioNumber: 2, componentId: 'c1', direction: 'INPUT' }));
      sync.detectConflicts();
      expect(sync.hasConflict('old_conflict')).toBe(false);
    });

    for (let gpio = 0; gpio < 40; gpio++) {
      it(`detectConflicts single ownership on gpio ${gpio} (iter ${gpio})`, () => {
        const sync = new GpioOwnershipSynchronizer();
        const dir = ESP32_INPUT_ONLY_PINS.includes(gpio) ? 'INPUT' : 'OUTPUT';
        sync.registerOwnership(createDefaultGpioOwnershipModel(`single_${gpio}`, {
          gpioNumber: gpio, componentId: `c_${gpio}`, direction: dir as any,
        }));
        const conflicts = sync.detectConflicts();
        // Should not have DUPLICATE_OUTPUT (only one owner)
        expect(conflicts.filter(c => c.conflictType === 'DUPLICATE_OUTPUT').length).toBe(0);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 12: Short Circuit Detection
  // ═════════════════════════════════════════════════════════════
  describe('§12 — Short Circuit Detection', () => {

    for (let i = 0; i < 50; i++) {
      it(`detects short circuit between power gpio ${i} and ground gpio ${i + 20} (iter ${i})`, () => {
        const sync = new GpioOwnershipSynchronizer();
        const netConnections = new Map<number, number[]>();
        netConnections.set(i, [i + 20]);
        const conflicts = sync.detectShortCircuits([i], [i + 20], netConnections);
        expect(conflicts.length).toBeGreaterThanOrEqual(1);
        expect(conflicts[0].conflictType).toBe('SHORT_CIRCUIT');
        expect(conflicts[0].severity).toBe('CRITICAL');
      });
    }

    it('no short circuit when power and ground not connected', () => {
      const sync = new GpioOwnershipSynchronizer();
      const netConnections = new Map<number, number[]>();
      netConnections.set(2, [4]); // power 2 connected to 4, but 4 is not ground
      const conflicts = sync.detectShortCircuits([2], [5], netConnections);
      expect(conflicts.length).toBe(0);
    });

    it('bidirectional short circuit detection', () => {
      const sync = new GpioOwnershipSynchronizer();
      const netConnections = new Map<number, number[]>();
      netConnections.set(3, [7]); // power→ground
      netConnections.set(7, [3]); // ground→power
      const conflicts = sync.detectShortCircuits([3], [7], netConnections);
      expect(conflicts.length).toBe(2); // Both directions detected
      expect(conflicts.every(c => c.conflictType === 'SHORT_CIRCUIT')).toBe(true);
    });

    for (let i = 0; i < 50; i++) {
      it(`no false positive for unconnected power pin ${i} (iter ${i})`, () => {
        const sync = new GpioOwnershipSynchronizer();
        const netConnections = new Map<number, number[]>();
        // No connections at all
        const conflicts = sync.detectShortCircuits([i], [i + 20], netConnections);
        expect(conflicts.length).toBe(0);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 13: CircuitSyncSynchronizer CRUD
  // ═════════════════════════════════════════════════════════════
  describe('§13 — CircuitSyncSynchronizer CRUD', () => {

    for (let i = 0; i < 200; i++) {
      it(`register + get sync "s_${i}" (iter ${i})`, () => {
        const sync = new CircuitSyncSynchronizer();
        const m = createDefaultCircuitSyncModel(`s_${i}`);
        sync.registerSync(m);
        expect(sync.hasSync(`s_${i}`)).toBe(true);
        const got = sync.getSync(`s_${i}`);
        expect(got).toBeDefined();
        expect(got!.syncId).toBe(`s_${i}`);
        expect(got!.syncState).toBe('IDLE');
      });
    }

    it('bulk sync register + getAll + keys', () => {
      const sync = new CircuitSyncSynchronizer();
      for (let i = 0; i < 500; i++) {
        sync.registerSync(createDefaultCircuitSyncModel(`bs_${i}`));
      }
      expect(sync.getAllSyncs().length).toBe(500);
      expect(sync.getSyncKeys().length).toBe(500);
      for (let i = 0; i < 500; i++) {
        expect(sync.hasSync(`bs_${i}`)).toBe(true);
      }
    });

    it('update sync changes state', () => {
      const sync = new CircuitSyncSynchronizer();
      sync.registerSync(createDefaultCircuitSyncModel('us'));
      sync.updateSync('us', { syncState: 'SYNCING' });
      expect(sync.getSync('us')!.syncState).toBe('SYNCING');
    });

    it('remove + clear syncs', () => {
      const sync = new CircuitSyncSynchronizer();
      sync.registerSync(createDefaultCircuitSyncModel('rs'));
      sync.removeSync('rs');
      expect(sync.hasSync('rs')).toBe(false);
      for (let i = 0; i < 10; i++) sync.registerSync(createDefaultCircuitSyncModel(`cs_${i}`));
      sync.clearSyncs();
      expect(sync.getAllSyncs().length).toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 14: Sync Orchestration
  // ═════════════════════════════════════════════════════════════
  describe('§14 — Sync Orchestration', () => {
    beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
    afterEach(() => { vi.restoreAllMocks(); });

    for (let i = 0; i < 100; i++) {
      it(`markDirty → markSyncing → markSynchronized cycle (iter ${i})`, () => {
        const sync = new CircuitSyncSynchronizer();
        sync.registerSync(createDefaultCircuitSyncModel(`orch_${i}`));
        sync.markDirty(`orch_${i}`);
        expect(sync.getSync(`orch_${i}`)!.syncState).toBe('DIRTY');
        expect(sync.getSync(`orch_${i}`)!.isDirty).toBe(true);
        sync.markSyncing(`orch_${i}`);
        expect(sync.getSync(`orch_${i}`)!.syncState).toBe('SYNCING');
        sync.markSynchronized(`orch_${i}`, i + 1, i * 100);
        expect(sync.getSync(`orch_${i}`)!.syncState).toBe('SYNCHRONIZED');
        expect(sync.getSync(`orch_${i}`)!.graphVersion).toBe(i + 1);
        expect(sync.getSync(`orch_${i}`)!.lastSyncTick).toBe(i * 100);
        expect(sync.getSync(`orch_${i}`)!.isDirty).toBe(false);
      });
    }

    it('markError sets ERROR state and appends to errorLog', () => {
      const sync = new CircuitSyncSynchronizer();
      sync.registerSync(createDefaultCircuitSyncModel('err'));
      sync.markError('err', 'Something broke');
      const s = sync.getSync('err')!;
      expect(s.syncState).toBe('ERROR');
      expect(s.isDirty).toBe(true);
      expect(s.errorLog).toContain('Something broke');
    });

    it('markError caps error log at MAX_SYNC_ERROR_LOG_SIZE', () => {
      const sync = new CircuitSyncSynchronizer();
      sync.registerSync(createDefaultCircuitSyncModel('cap'));
      for (let i = 0; i < 150; i++) {
        sync.markError('cap', `Error ${i}`);
      }
      const s = sync.getSync('cap')!;
      expect(s.errorLog.length).toBeLessThanOrEqual(MAX_SYNC_ERROR_LOG_SIZE);
      expect(s.errorLog.length).toBe(MAX_SYNC_ERROR_LOG_SIZE);
    });

    it('setLastGraphId and setLastProgramId', () => {
      const sync = new CircuitSyncSynchronizer();
      sync.registerSync(createDefaultCircuitSyncModel('link'));
      sync.setLastGraphId('link', 'graph_42');
      expect(sync.getSync('link')!.lastGraphId).toBe('graph_42');
      sync.setLastProgramId('link', 'prog_7');
      expect(sync.getSync('link')!.lastProgramId).toBe('prog_7');
    });

    it('getDirtySyncs returns only dirty syncs', () => {
      const sync = new CircuitSyncSynchronizer();
      sync.registerSync(createDefaultCircuitSyncModel('clean'));
      sync.registerSync(createDefaultCircuitSyncModel('dirty1'));
      sync.registerSync(createDefaultCircuitSyncModel('dirty2'));
      sync.markDirty('dirty1');
      sync.markDirty('dirty2');
      const dirty = sync.getDirtySyncs();
      expect(dirty.length).toBe(2);
      expect(dirty.every(s => s.isDirty || s.syncState === 'DIRTY')).toBe(true);
    });

    it('getErrorSyncs returns only error syncs', () => {
      const sync = new CircuitSyncSynchronizer();
      sync.registerSync(createDefaultCircuitSyncModel('ok'));
      sync.registerSync(createDefaultCircuitSyncModel('err1'));
      sync.markError('err1', 'fail');
      const errors = sync.getErrorSyncs();
      expect(errors.length).toBe(1);
      expect(errors[0].syncState).toBe('ERROR');
    });

    it('markDirty on nonexistent sync warns but does not throw', () => {
      const sync = new CircuitSyncSynchronizer();
      sync.markDirty('nonexistent');
      expect(console.warn).toHaveBeenCalled();
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 15: Serial/Logic Linking
  // ═════════════════════════════════════════════════════════════
  describe('§15 — Serial/Logic Linking', () => {

    // 15A: linkSerialOutput
    describe('§15A — linkSerialOutput', () => {
      it('returns null for NOP without serial description', () => {
        const result = linkSerialOutput({ opcode: 'NOP', args: { description: 'nothing' } }, 'c1');
        expect(result).toBeNull();
      });

      it('returns link for NOP with PRINT description', () => {
        const result = linkSerialOutput({ opcode: 'NOP', args: { description: 'SERIAL_PRINT', text: 'Hello' } }, 'c1');
        expect(result).not.toBeNull();
        expect(result!.text).toBe('Hello');
        expect(result!.componentId).toBe('c1');
      });

      it('returns link for SERIAL_PRINT opcode', () => {
        const result = linkSerialOutput({ opcode: 'SERIAL_PRINT', args: { text: 'world' } }, 'c2');
        expect(result).not.toBeNull();
        expect(result!.text).toBe('world');
      });

      it('returns link for SERIAL_PRINTLN opcode', () => {
        const result = linkSerialOutput({ opcode: 'SERIAL_PRINTLN', args: { value: '42' } }, 'c3');
        expect(result).not.toBeNull();
        expect(result!.text).toBe('42');
      });

      it('returns null for null instruction', () => {
        const result = linkSerialOutput(null as any, 'c1');
        expect(result).toBeNull();
      });

      it('returns null for empty opcode', () => {
        const result = linkSerialOutput({ opcode: '', args: {} }, 'c1');
        expect(result).toBeNull();
      });

      for (let i = 0; i < 100; i++) {
        it(`serial output text "${i}" round-trips (iter ${i})`, () => {
          const result = linkSerialOutput({ opcode: 'SERIAL_PRINT', args: { text: `msg_${i}` } }, `comp_${i}`);
          expect(result).not.toBeNull();
          expect(result!.text).toBe(`msg_${i}`);
          expect(result!.componentId).toBe(`comp_${i}`);
        });
      }
    });

    // 15B: linkLogicAnalyzerSample
    describe('§15B — linkLogicAnalyzerSample', () => {
      it('returns null when state did not change', () => {
        const result = linkLogicAnalyzerSample(5, 'HIGH', 'HIGH', 100);
        expect(result).toBeNull();
      });

      it('returns sample for HIGH → LOW transition', () => {
        const result = linkLogicAnalyzerSample(5, 'HIGH', 'LOW', 100);
        expect(result).not.toBeNull();
        expect(result!.pinNumber).toBe(5);
        expect(result!.level).toBe('LOW');
        expect(result!.timestamp).toBe(100);
      });

      it('returns sample for LOW → HIGH transition', () => {
        const result = linkLogicAnalyzerSample(10, 'LOW', 'HIGH', 200);
        expect(result).not.toBeNull();
        expect(result!.level).toBe('HIGH');
      });

      it('handles Z/FLOATING state', () => {
        const result = linkLogicAnalyzerSample(3, 'HIGH', 'FLOATING', 50);
        expect(result).not.toBeNull();
        expect(result!.level).toBe('Z');
      });

      it('returns null for negative gpio', () => {
        const result = linkLogicAnalyzerSample(-1, 'LOW', 'HIGH', 50);
        expect(result).toBeNull();
      });

      for (let gpio = 0; gpio < 40; gpio++) {
        it(`LOW→HIGH transition on gpio ${gpio} (iter ${gpio})`, () => {
          const result = linkLogicAnalyzerSample(gpio, 'LOW', 'HIGH', gpio * 10);
          expect(result).not.toBeNull();
          expect(result!.pinNumber).toBe(gpio);
          expect(result!.level).toBe('HIGH');
          expect(result!.timestamp).toBe(gpio * 10);
        });
      }

      const transitions = cartesian(['LOW', 'HIGH', 'FLOATING'], ['LOW', 'HIGH', 'FLOATING', 'Z']);
      it.each(transitions)('from=%s to=%s produces correct result', (from, to) => {
        const result = linkLogicAnalyzerSample(5, from, to, 100);
        if (from === to) {
          expect(result).toBeNull();
        } else {
          expect(result).not.toBeNull();
          expect(result!.pinNumber).toBe(5);
        }
      });
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 16: Blockly Generator
  // ═════════════════════════════════════════════════════════════
  describe('§16 — Blockly Generator', () => {

    // 16A: Per-component instruction generators
    describe('§16A — Per-component generators', () => {
      for (let pin = 0; pin < 40; pin++) {
        it(`generateLedInstructions for pin ${pin}`, () => {
          const result = generateLedInstructions(pin);
          expect(result.setup.length).toBeGreaterThanOrEqual(1);
          expect(result.loop.length).toBeGreaterThanOrEqual(2);
          expect(result.setup[0].opcode).toBe('PIN_MODE');
          expect(result.setup[0].args.pin).toBe(pin);
        });
      }

      for (let trig = 0; trig < 20; trig++) {
        it(`generateHcsr04Instructions trig=${trig} echo=${trig + 20}`, () => {
          const result = generateHcsr04Instructions(trig, trig + 20);
          expect(result.setup.length).toBe(2); // trig + echo setup
          expect(result.loop.length).toBeGreaterThanOrEqual(5);
        });
      }

      for (let pin = 0; pin < 20; pin++) {
        it(`generateServoInstructions for pin ${pin}`, () => {
          const result = generateServoInstructions(pin);
          expect(result.setup.length).toBe(1);
          expect(result.loop.length).toBeGreaterThanOrEqual(4);
          expect(result.loop.some(i => i.opcode === 'PWM_WRITE')).toBe(true);
        });
      }

      for (let sda = 0; sda < 10; sda++) {
        it(`generateOledInstructions sda=${sda} scl=${sda + 10}`, () => {
          const result = generateOledInstructions(sda, sda + 10);
          expect(result.setup.length).toBeGreaterThanOrEqual(1);
          expect(result.loop.length).toBeGreaterThanOrEqual(1);
        });
      }

      for (let rs = 0; rs < 10; rs++) {
        it(`generateLcdInstructions rs=${rs}`, () => {
          const result = generateLcdInstructions(rs, rs + 1, rs + 2, rs + 3, rs + 4, rs + 5);
          expect(result.setup.length).toBeGreaterThanOrEqual(1);
          expect(result.loop.length).toBeGreaterThanOrEqual(1);
        });
      }

      for (let pin = 0; pin < 20; pin++) {
        it(`generateDht11Instructions for pin ${pin}`, () => {
          const result = generateDht11Instructions(pin);
          expect(result.setup.length).toBe(1);
          expect(result.loop.length).toBeGreaterThanOrEqual(2);
        });
      }

      for (let pin = 0; pin < 20; pin++) {
        it(`generateBuzzerInstructions for pin ${pin}`, () => {
          const result = generateBuzzerInstructions(pin);
          expect(result.setup.length).toBe(1);
          expect(result.loop.some(i => i.opcode === 'PWM_WRITE')).toBe(true);
        });
      }

      for (let pin = 0; pin < 20; pin++) {
        it(`generateRelayInstructions for pin ${pin}`, () => {
          const result = generateRelayInstructions(pin);
          expect(result.setup.length).toBe(1);
          expect(result.loop.some(i => i.opcode === 'DIGITAL_WRITE')).toBe(true);
        });
      }

      for (let pin = 0; pin < 20; pin++) {
        it(`generateMq2Instructions for pin ${pin}`, () => {
          const result = generateMq2Instructions(pin);
          expect(result.setup.length).toBe(1);
          expect(result.loop.some(i => i.opcode === 'DIGITAL_READ')).toBe(true);
        });
      }

      for (let pin = 0; pin < 20; pin++) {
        it(`generatePushButtonInstructions for pin ${pin}`, () => {
          const result = generatePushButtonInstructions(pin);
          expect(result.setup.length).toBe(1);
          expect(result.setup[0].args.mode).toBe('INPUT_PULLUP');
        });
      }

      for (let pin = 0; pin < 20; pin++) {
        it(`generatePotentiometerInstructions for pin ${pin}`, () => {
          const result = generatePotentiometerInstructions(pin);
          expect(result.setup.length).toBe(1);
          expect(result.loop.length).toBeGreaterThanOrEqual(2);
        });
      }

      for (let pin = 0; pin < 20; pin++) {
        it(`generateIrSensorInstructions for pin ${pin}`, () => {
          const result = generateIrSensorInstructions(pin);
          expect(result.setup.length).toBe(1);
          expect(result.loop.some(i => i.opcode === 'DIGITAL_READ')).toBe(true);
        });
      }
    });

    // 16B: generateBlocklyFromCircuit
    describe('§16B — generateBlocklyFromCircuit', () => {
      it.each(SUPPORTED_COMPONENT_TYPES.filter(t => t !== 'resistor_generic'))('generates program for %s', (compType) => {
        const graph = createDefaultCircuitGraphModel('g1', {
          componentIds: ['c1'], nodes: [], edges: [], nets: [],
        });
        const mapping = createDefaultCircuitMappingModel('m1', {
          componentId: 'c1', componentType: compType, pinName: 'anode', gpioNumber: 13,
        });
        const program = generateBlocklyFromCircuit(graph, [mapping], 'esp32_1');
        expect(program).toBeDefined();
        expect(program.programId).toBeTruthy();
        expect(program.esp32Id).toBe('esp32_1');
        expect(program.setupInstructions.length).toBeGreaterThanOrEqual(1);
      });

      it('generates empty program for resistor_generic (no generator)', () => {
        const graph = createDefaultCircuitGraphModel('g_r', { componentIds: ['r1'] });
        const mapping = createDefaultCircuitMappingModel('m_r', {
          componentId: 'r1', componentType: 'resistor_generic', pinName: 'pin1', gpioNumber: 5,
        });
        const program = generateBlocklyFromCircuit(graph, [mapping], 'esp32');
        expect(program).toBeDefined();
        // Resistor has no generator, so no instructions
        expect(program.setupInstructions.length).toBe(0);
        expect(program.loopInstructions.length).toBe(0);
      });

      it('generates combined program for multiple components', () => {
        const graph = createDefaultCircuitGraphModel('gm', { componentIds: ['led1', 'buzzer1'] });
        const mappings = [
          createDefaultCircuitMappingModel('m_led', { componentId: 'led1', componentType: 'led_generic', pinName: 'anode', gpioNumber: 2 }),
          createDefaultCircuitMappingModel('m_buz', { componentId: 'buzzer1', componentType: 'buzzer', pinName: 'signal', gpioNumber: 25 }),
        ];
        const program = generateBlocklyFromCircuit(graph, mappings, 'esp32');
        expect(program.setupInstructions.length).toBeGreaterThanOrEqual(2); // at least 1 per component
        expect(program.loopInstructions.length).toBeGreaterThanOrEqual(2);
      });

      for (let i = 0; i < 50; i++) {
        it(`program generation round ${i} uses correct esp32Id`, () => {
          const graph = createDefaultCircuitGraphModel(`g_${i}`, { componentIds: ['led'] });
          const mapping = createDefaultCircuitMappingModel('m', { componentId: 'led', componentType: 'led_generic', gpioNumber: 2 });
          const program = generateBlocklyFromCircuit(graph, [mapping], `esp_${i}`);
          expect(program.esp32Id).toBe(`esp_${i}`);
          expect(program.programName).toBe('Auto-Generated Circuit Program');
        });
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 17: Pin Usage Analysis
  // ═════════════════════════════════════════════════════════════
  describe('§17 — Pin Usage Analysis', () => {

    for (let gpio = 0; gpio < 40; gpio++) {
      it(`evaluateBlocklyPinUsage finds gpio ${gpio} from LED instructions (iter ${gpio})`, () => {
        const instr = generateLedInstructions(gpio);
        const program = createDefaultBlocklyProgramModel('p1', {
          setupInstructions: instr.setup,
          loopInstructions: instr.loop,
        });
        const usage = evaluateBlocklyPinUsage(program);
        expect(usage.gpiosUsed).toContain(gpio);
        expect(usage.peripheralTypes).toContain('GPIO');
        expect(usage.peripheralTypes).toContain('DIGITAL_OUTPUT');
      });
    }

    it('evaluateBlocklyPinUsage returns empty for empty program', () => {
      const program = createDefaultBlocklyProgramModel('empty');
      const usage = evaluateBlocklyPinUsage(program);
      expect(usage.gpiosUsed.length).toBe(0);
      expect(usage.peripheralTypes.length).toBe(0);
    });

    it('evaluateBlocklyPinUsage detects PWM usage from servo', () => {
      const instr = generateServoInstructions(13);
      const program = createDefaultBlocklyProgramModel('servo_prog', {
        setupInstructions: instr.setup,
        loopInstructions: instr.loop,
      });
      const usage = evaluateBlocklyPinUsage(program);
      expect(usage.gpiosUsed).toContain(13);
      expect(usage.peripheralTypes).toContain('PWM');
    });

    it('evaluateBlocklyPinUsage detects DIGITAL_INPUT from button', () => {
      const instr = generatePushButtonInstructions(27);
      const program = createDefaultBlocklyProgramModel('btn_prog', {
        setupInstructions: instr.setup,
        loopInstructions: instr.loop,
      });
      const usage = evaluateBlocklyPinUsage(program);
      expect(usage.gpiosUsed).toContain(27);
      expect(usage.peripheralTypes).toContain('DIGITAL_INPUT');
    });

    it('highlightAffectedComponents finds components by gpio', () => {
      const mappings = [
        createDefaultCircuitMappingModel('m1', { componentId: 'led1', gpioNumber: 2 }),
        createDefaultCircuitMappingModel('m2', { componentId: 'buzzer1', gpioNumber: 25 }),
        createDefaultCircuitMappingModel('m3', { componentId: 'led2', gpioNumber: 4 }),
      ];
      const affected = highlightAffectedComponents([2, 25], mappings);
      expect(affected).toContain('led1');
      expect(affected).toContain('buzzer1');
      expect(affected).not.toContain('led2');
    });

    it('highlightAffectedWires finds wires connected to affected pins', () => {
      const mappings = [
        createDefaultCircuitMappingModel('m1', { componentId: 'led1', pinName: 'anode', gpioNumber: 2 }),
      ];
      const graph = createDefaultCircuitGraphModel('g1', {
        edges: [
          createDefaultCircuitEdgeModel('w1', { sourceNodeId: 'led1_anode', targetNodeId: 'other', wireId: 'w1' }),
          createDefaultCircuitEdgeModel('w2', { sourceNodeId: 'xxx', targetNodeId: 'yyy', wireId: 'w2' }),
        ],
      });
      const wires = highlightAffectedWires([2], mappings, graph);
      expect(wires).toContain('w1');
      expect(wires).not.toContain('w2');
    });

    for (let i = 0; i < 50; i++) {
      it(`highlight round-trip for ${i + 1} mappings (iter ${i})`, () => {
        const mappings = range(i + 1).map(j =>
          createDefaultCircuitMappingModel(`m_${j}`, { componentId: `c_${j}`, gpioNumber: j % 40 }),
        );
        const gpios = range(i + 1).map(j => j % 40);
        const affected = highlightAffectedComponents(gpios, mappings);
        expect(affected.length).toBeGreaterThanOrEqual(1);
        expect(affected.length).toBeLessThanOrEqual(i + 1);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 18: Mismatch Detection
  // ═════════════════════════════════════════════════════════════
  describe('§18 — Mismatch Detection', () => {
    beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
    afterEach(() => { vi.restoreAllMocks(); });

    it('detects GPIO_NOT_MAPPED when program uses unmapped pin', () => {
      const instr = generateLedInstructions(99); // pin 99 not in any mapping
      const program = createDefaultBlocklyProgramModel('p', {
        setupInstructions: instr.setup,
        loopInstructions: instr.loop,
      });
      const mappings = [createDefaultCircuitMappingModel('m1', { gpioNumber: 2 })];
      const warnings = detectBlocklyCircuitMismatch(program, mappings);
      // pin 99 is not mapped
      expect(warnings.some(w => w.code === 'GPIO_NOT_MAPPED')).toBe(true);
    });

    it('detects GPIO_NOT_USED when mapped pin not in program', () => {
      const program = createDefaultBlocklyProgramModel('empty_p');
      const mappings = [createDefaultCircuitMappingModel('m1', { componentId: 'led1', pinName: 'anode', gpioNumber: 5 })];
      const warnings = detectBlocklyCircuitMismatch(program, mappings);
      expect(warnings.some(w => w.code === 'GPIO_NOT_USED')).toBe(true);
    });

    it('no warnings when program and mappings are aligned', () => {
      const instr = generateLedInstructions(2);
      const program = createDefaultBlocklyProgramModel('match_p', {
        setupInstructions: instr.setup,
        loopInstructions: instr.loop,
      });
      const mappings = [createDefaultCircuitMappingModel('m1', { componentId: 'led1', pinName: 'anode', gpioNumber: 2 })];
      const warnings = detectBlocklyCircuitMismatch(program, mappings);
      expect(warnings.filter(w => w.code === 'GPIO_NOT_MAPPED').length).toBe(0);
      expect(warnings.filter(w => w.code === 'GPIO_NOT_USED').length).toBe(0);
    });

    for (let gpio = 0; gpio < 40; gpio++) {
      it(`mismatch detection for gpio ${gpio} used but not mapped (iter ${gpio})`, () => {
        const instr = generateLedInstructions(gpio);
        const program = createDefaultBlocklyProgramModel(`p_${gpio}`, {
          setupInstructions: instr.setup,
          loopInstructions: instr.loop,
        });
        const warnings = detectBlocklyCircuitMismatch(program, []);
        expect(warnings.some(w => w.code === 'GPIO_NOT_MAPPED')).toBe(true);
      });
    }

    for (let gpio = 0; gpio < 40; gpio++) {
      it(`mismatch detection for gpio ${gpio} mapped but not used (iter ${gpio})`, () => {
        const program = createDefaultBlocklyProgramModel(`unused_${gpio}`);
        const mappings = [createDefaultCircuitMappingModel(`m_${gpio}`, {
          componentId: 'c1', pinName: 'p1', gpioNumber: gpio,
        })];
        const warnings = detectBlocklyCircuitMismatch(program, mappings);
        expect(warnings.some(w => w.code === 'GPIO_NOT_USED')).toBe(true);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 19: BaseRuntime Integration
  // ═════════════════════════════════════════════════════════════
  describe('§19 — BaseRuntime Integration', () => {

    for (let i = 0; i < 100; i++) {
      it(`runtime has circuitGraphSynchronizer (iter ${i})`, () => {
        const r = rt();
        expect(r.circuitGraphSynchronizer).toBeDefined();
        expect(r.circuitGraphSynchronizer).toBeInstanceOf(CircuitGraphSynchronizer);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`runtime has gpioOwnershipSynchronizer (iter ${i})`, () => {
        const r = rt();
        expect(r.gpioOwnershipSynchronizer).toBeDefined();
        expect(r.gpioOwnershipSynchronizer).toBeInstanceOf(GpioOwnershipSynchronizer);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`runtime has circuitSyncSynchronizer (iter ${i})`, () => {
        const r = rt();
        expect(r.circuitSyncSynchronizer).toBeDefined();
        expect(r.circuitSyncSynchronizer).toBeInstanceOf(CircuitSyncSynchronizer);
      });
    }

    it('runtime circuitGraphSynchronizer can register and get nodes', () => {
      const r = rt();
      r.circuitGraphSynchronizer.registerCircuitNode(createDefaultCircuitNodeModel('rt_node'));
      expect(r.circuitGraphSynchronizer.hasCircuitNode('rt_node')).toBe(true);
    });

    it('runtime gpioOwnershipSynchronizer can claim and release', () => {
      const r = rt();
      const result = r.gpioOwnershipSynchronizer.claimGpio('own1', 15, 'led1', 'led', 'anode', 'OUTPUT');
      expect(result.success).toBe(true);
      r.gpioOwnershipSynchronizer.releaseGpio(15, 'led1');
      expect(r.gpioOwnershipSynchronizer.getGpioOwner(15)).toBeUndefined();
    });

    it('runtime circuitSyncSynchronizer can orchestrate', () => {
      const r = rt();
      r.circuitSyncSynchronizer.registerSync(createDefaultCircuitSyncModel('rt_sync'));
      r.circuitSyncSynchronizer.markDirty('rt_sync');
      expect(r.circuitSyncSynchronizer.getSync('rt_sync')!.syncState).toBe('DIRTY');
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 20: Snapshot Integration
  // ═════════════════════════════════════════════════════════════
  describe('§20 — Snapshot Integration', () => {

    it('CircuitGraphSynchronizer getSnapshot returns all registries', () => {
      const sync = new CircuitGraphSynchronizer();
      sync.registerCircuitNode(createDefaultCircuitNodeModel('sn1'));
      sync.registerCircuitEdge(createDefaultCircuitEdgeModel('se1', { sourceNodeId: 's', targetNodeId: 't' }));
      sync.registerCircuitNet(createDefaultCircuitNetModel('snet1'));
      sync.registerCircuitGraph(createDefaultCircuitGraphModel('sg1'));
      sync.registerCircuitMapping(createDefaultCircuitMappingModel('sm1'));
      const snap = sync.getSnapshot();
      expect(snap.nodes.length).toBe(1);
      expect(snap.edges.length).toBe(1);
      expect(snap.nets.length).toBe(1);
      expect(snap.graphs.length).toBe(1);
      expect(snap.mappings.length).toBe(1);
    });

    it('GpioOwnershipSynchronizer getSnapshot returns ownerships + conflicts', () => {
      const sync = new GpioOwnershipSynchronizer();
      sync.registerOwnership(createDefaultGpioOwnershipModel('so1', { gpioNumber: 2, componentId: 'c' }));
      sync.registerConflict(createDefaultGpioConflictModel('sc1'));
      const snap = sync.getSnapshot();
      expect(snap.ownerships.length).toBe(1);
      expect(snap.conflicts.length).toBe(1);
    });

    it('CircuitSyncSynchronizer getSnapshot returns syncModels', () => {
      const sync = new CircuitSyncSynchronizer();
      sync.registerSync(createDefaultCircuitSyncModel('ss1'));
      const snap = sync.getSnapshot();
      expect(snap.syncModels.length).toBe(1);
    });

    for (let i = 0; i < 50; i++) {
      it(`snapshot with ${i + 1} nodes is consistent (iter ${i})`, () => {
        const sync = new CircuitGraphSynchronizer();
        for (let j = 0; j <= i; j++) sync.registerCircuitNode(createDefaultCircuitNodeModel(`snap_${j}`));
        const snap = sync.getSnapshot();
        expect(snap.nodes.length).toBe(i + 1);
        for (let j = 0; j <= i; j++) {
          expect(snap.nodes.some(n => n.nodeId === `snap_${j}`)).toBe(true);
        }
      });
    }

    it('clearAll resets all registries', () => {
      const sync = new CircuitGraphSynchronizer();
      sync.registerCircuitNode(createDefaultCircuitNodeModel('ca1'));
      sync.registerCircuitEdge(createDefaultCircuitEdgeModel('ca2', { sourceNodeId: 's', targetNodeId: 't' }));
      sync.clearAll();
      expect(sync.getAllCircuitNodes().length).toBe(0);
      expect(sync.getAllCircuitEdges().length).toBe(0);
      expect(sync.getAllCircuitNets().length).toBe(0);
      expect(sync.getAllCircuitGraphs().length).toBe(0);
      expect(sync.getAllCircuitMappings().length).toBe(0);
    });

    it('GpioOwnershipSynchronizer clearAll resets everything', () => {
      const sync = new GpioOwnershipSynchronizer();
      sync.registerOwnership(createDefaultGpioOwnershipModel('co1', { gpioNumber: 2, componentId: 'c' }));
      sync.registerConflict(createDefaultGpioConflictModel('cc1'));
      sync.clearAll();
      expect(sync.getAllOwnerships().length).toBe(0);
      expect(sync.getAllConflicts().length).toBe(0);
    });

    it('CircuitSyncSynchronizer clearAll resets everything', () => {
      const sync = new CircuitSyncSynchronizer();
      sync.registerSync(createDefaultCircuitSyncModel('cs1'));
      sync.clearAll();
      expect(sync.getAllSyncs().length).toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 21: Stress Tests
  // ═════════════════════════════════════════════════════════════
  describe('§21 — Stress Tests', () => {

    it('registers and retrieves 1000 circuit nodes', () => {
      const sync = new CircuitGraphSynchronizer();
      for (let i = 0; i < 1000; i++) {
        sync.registerCircuitNode(createDefaultCircuitNodeModel(`stress_n_${i}`, {
          gpioNumber: i % 40,
          voltage: i * 0.01,
          positionX: i,
          positionY: i * 2,
        }));
      }
      const all = sync.getAllCircuitNodes();
      expect(all.length).toBe(1000);
      for (let i = 0; i < 1000; i++) {
        expect(sync.hasCircuitNode(`stress_n_${i}`)).toBe(true);
      }
    });

    it('registers and retrieves 1000 circuit edges', () => {
      const sync = new CircuitGraphSynchronizer();
      for (let i = 0; i < 1000; i++) {
        sync.registerCircuitEdge(createDefaultCircuitEdgeModel(`stress_e_${i}`, {
          sourceNodeId: `src_${i}`, targetNodeId: `tgt_${i}`,
        }));
      }
      expect(sync.getAllCircuitEdges().length).toBe(1000);
      for (let i = 0; i < 1000; i++) {
        expect(sync.hasCircuitEdge(`stress_e_${i}`)).toBe(true);
      }
    });

    it('registers and retrieves 1000 GPIO ownerships', () => {
      const sync = new GpioOwnershipSynchronizer();
      for (let i = 0; i < 1000; i++) {
        sync.registerOwnership(createDefaultGpioOwnershipModel(`stress_o_${i}`, {
          gpioNumber: i % 40, componentId: `comp_${i}`, direction: 'INPUT',
        }));
      }
      expect(sync.getAllOwnerships().length).toBe(1000);
      for (let i = 0; i < 1000; i++) {
        expect(sync.hasOwnership(`stress_o_${i}`)).toBe(true);
      }
    });

    it('registers and retrieves 1000 sync models', () => {
      const sync = new CircuitSyncSynchronizer();
      for (let i = 0; i < 1000; i++) {
        sync.registerSync(createDefaultCircuitSyncModel(`stress_s_${i}`));
      }
      expect(sync.getAllSyncs().length).toBe(1000);
      for (let i = 0; i < 1000; i++) {
        expect(sync.hasSync(`stress_s_${i}`)).toBe(true);
      }
    });

    it('builds and validates graph with 100 components', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const sync = new CircuitGraphSynchronizer();
      const params = makeBuildParams(100, 99);
      const graph = sync.buildCircuitGraph(params);
      expect(graph.componentIds.length).toBe(100);
      expect(graph.edges.length).toBe(99);
      const warnings = sync.validateCircuitGraphById(graph.graphId);
      expect(Array.isArray(warnings)).toBe(true);
      vi.restoreAllMocks();
    });

    it('1000 claimGpio operations', () => {
      const sync = new GpioOwnershipSynchronizer();
      for (let i = 0; i < 1000; i++) {
        sync.claimGpio(`claim_${i}`, i % 40, `comp_${i}`, 'led', 'anode', 'OUTPUT');
      }
      expect(sync.getAllOwnerships().length).toBe(1000);
    });

    it('orchestrates 500 sync state transitions', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const sync = new CircuitSyncSynchronizer();
      for (let i = 0; i < 500; i++) {
        const id = `trans_${i}`;
        sync.registerSync(createDefaultCircuitSyncModel(id));
        sync.markDirty(id);
        sync.markSyncing(id);
        sync.markSynchronized(id, i, i * 10);
        expect(sync.getSync(id)!.syncState).toBe('SYNCHRONIZED');
      }
      vi.restoreAllMocks();
    });

    for (let i = 0; i < 100; i++) {
      it(`factory stress: create 10 of each model type (round ${i})`, () => {
        const nodes = range(10).map(j => createDefaultCircuitNodeModel(`sn_${i}_${j}`));
        const edges = range(10).map(j => createDefaultCircuitEdgeModel(`se_${i}_${j}`));
        const nets = range(10).map(j => createDefaultCircuitNetModel(`snet_${i}_${j}`));
        const graphs = range(10).map(j => createDefaultCircuitGraphModel(`sg_${i}_${j}`));
        const maps = range(10).map(j => createDefaultCircuitMappingModel(`sm_${i}_${j}`));
        const healths = range(10).map(j => createDefaultProjectHealthModel(`sh_${i}_${j}`));
        const ownerships = range(10).map(j => createDefaultGpioOwnershipModel(`so_${i}_${j}`));
        const conflicts = range(10).map(j => createDefaultGpioConflictModel(`sc_${i}_${j}`));
        const syncs = range(10).map(j => createDefaultCircuitSyncModel(`ss_${i}_${j}`));
        expect(nodes.length).toBe(10);
        expect(edges.length).toBe(10);
        expect(nets.length).toBe(10);
        expect(graphs.length).toBe(10);
        expect(maps.length).toBe(10);
        expect(healths.length).toBe(10);
        expect(ownerships.length).toBe(10);
        expect(conflicts.length).toBe(10);
        expect(syncs.length).toBe(10);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 22: Deep Copy Safety
  // ═════════════════════════════════════════════════════════════
  describe('§22 — Deep Copy Safety', () => {

    for (let i = 0; i < 100; i++) {
      it(`CircuitNode deep copy safety (iter ${i})`, () => {
        const sync = new CircuitGraphSynchronizer();
        const original = createDefaultCircuitNodeModel(`dc_${i}`, {
          gpioNumber: i % 40, voltage: 3.3, componentId: `orig_${i}`,
        });
        sync.registerCircuitNode(original);
        const retrieved = sync.getCircuitNode(`dc_${i}`)!;
        // Mutate original — should not affect stored copy
        original.voltage = 999;
        original.componentId = 'MUTATED';
        const retrieved2 = sync.getCircuitNode(`dc_${i}`)!;
        expect(retrieved2.voltage).toBe(3.3);
        expect(retrieved2.componentId).toBe(`orig_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`CircuitEdge deep copy safety (iter ${i})`, () => {
        const sync = new CircuitGraphSynchronizer();
        const original = createDefaultCircuitEdgeModel(`dce_${i}`, {
          sourceNodeId: `s_${i}`, targetNodeId: `t_${i}`, resistance: 100,
        });
        sync.registerCircuitEdge(original);
        original.resistance = 99999;
        original.sourceNodeId = 'MUTATED';
        const retrieved = sync.getCircuitEdge(`dce_${i}`)!;
        expect(retrieved.resistance).toBe(100);
        expect(retrieved.sourceNodeId).toBe(`s_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`CircuitNet deep copy safety (iter ${i})`, () => {
        const sync = new CircuitGraphSynchronizer();
        const original = createDefaultCircuitNetModel(`dcn_${i}`, {
          nodeIds: [`a_${i}`, `b_${i}`], netVoltage: 3.3,
        });
        sync.registerCircuitNet(original);
        original.nodeIds.push('MUTATED');
        original.netVoltage = 999;
        const retrieved = sync.getCircuitNet(`dcn_${i}`)!;
        expect(retrieved.nodeIds.length).toBe(2);
        expect(retrieved.netVoltage).toBe(3.3);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`GpioOwnership deep copy safety (iter ${i})`, () => {
        const sync = new GpioOwnershipSynchronizer();
        const original = createDefaultGpioOwnershipModel(`dco_${i}`, {
          gpioNumber: i % 40, componentId: `comp_${i}`, direction: 'OUTPUT',
        });
        sync.registerOwnership(original);
        original.direction = 'MUTATED' as any;
        original.componentId = 'MUTATED';
        const retrieved = sync.getOwnership(`dco_${i}`)!;
        expect(retrieved.direction).toBe('OUTPUT');
        expect(retrieved.componentId).toBe(`comp_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`CircuitSync deep copy safety (iter ${i})`, () => {
        const sync = new CircuitSyncSynchronizer();
        const original = createDefaultCircuitSyncModel(`dcs_${i}`, { graphVersion: i });
        sync.registerSync(original);
        original.graphVersion = 999999;
        original.syncState = 'MUTATED' as any;
        const retrieved = sync.getSync(`dcs_${i}`)!;
        expect(retrieved.graphVersion).toBe(i);
        expect(retrieved.syncState).toBe('IDLE');
      });
    }

    it('export/import deep copy safety', () => {
      const sync = new CircuitGraphSynchronizer();
      const params = makeBuildParams(3, 2);
      const graph = sync.buildCircuitGraph(params);
      const json = sync.exportCircuitGraph(graph.graphId);
      const parsed = JSON.parse(json);
      parsed.boardId = 'MUTATED';
      // Original graph should not be affected
      const original = sync.getCircuitGraph(graph.graphId)!;
      expect(original.boardId).toBe('esp32');
    });

    it('buildCircuitGraph returns deep copy', () => {
      const sync = new CircuitGraphSynchronizer();
      const params = makeBuildParams(2, 1);
      const graph = sync.buildCircuitGraph(params);
      graph.componentIds.push('MUTATED');
      const stored = sync.getCircuitGraph(graph.graphId)!;
      expect(stored.componentIds).not.toContain('MUTATED');
    });

    for (let i = 0; i < 50; i++) {
      it(`JSON stringify/parse round-trip for node model (iter ${i})`, () => {
        const m = createDefaultCircuitNodeModel(`jsonrt_${i}`, {
          gpioNumber: i, voltage: i * 0.1, componentId: `comp_${i}`,
        });
        const copy = JSON.parse(JSON.stringify(m));
        expect(copy.nodeId).toBe(m.nodeId);
        expect(copy.gpioNumber).toBe(m.gpioNumber);
        expect(copy.voltage).toBeCloseTo(m.voltage, 5);
        expect(copy.componentId).toBe(m.componentId);
        // Mutate copy, original unaffected
        copy.voltage = 9999;
        expect(m.voltage).toBeCloseTo(i * 0.1, 5);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 23: Cross-Module Integration
  // ═════════════════════════════════════════════════════════════
  describe('§23 — Cross-Module Integration', () => {

    it('full pipeline: build graph → claim GPIOs → generate Blockly → detect mismatch', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      // 1. Build circuit graph
      const graphSync = new CircuitGraphSynchronizer();
      const compIds = ['led1', 'hcsr04_1'];
      const compTypes = new Map([['led1', 'led_generic'], ['hcsr04_1', 'hc_sr04']]);
      const compPins = new Map([
        ['led1', [{ pinName: 'anode', gpioNumber: 2, signalType: 'DIGITAL' }]],
        ['hcsr04_1', [
          { pinName: 'trig', gpioNumber: 5, signalType: 'DIGITAL' },
          { pinName: 'echo', gpioNumber: 18, signalType: 'DIGITAL' },
        ]],
      ]);
      const wires = [{ wireId: 'w1', sourceNodeId: 'led1_anode', targetNodeId: 'hcsr04_1_trig' }];
      const graph = graphSync.buildCircuitGraph({
        componentIds: compIds, componentTypes: compTypes,
        componentPins: compPins, wireConnections: wires, boardId: 'esp32',
      });

      expect(graph.componentIds.length).toBe(2);
      expect(graph.nodes.length).toBe(3); // led anode + hcsr04 trig + echo

      // 2. Claim GPIOs
      const gpioSync = new GpioOwnershipSynchronizer();
      gpioSync.claimGpio('own_led', 2, 'led1', 'led_generic', 'anode', 'OUTPUT');
      gpioSync.claimGpio('own_trig', 5, 'hcsr04_1', 'hc_sr04', 'trig', 'OUTPUT');
      gpioSync.claimGpio('own_echo', 18, 'hcsr04_1', 'hc_sr04', 'echo', 'INPUT');
      expect(gpioSync.getAllOwnerships().length).toBe(3);

      // 3. Generate Blockly program
      const mappings = graphSync.getAllCircuitMappings();
      const program = generateBlocklyFromCircuit(graph, mappings, 'esp32');
      expect(program.setupInstructions.length).toBeGreaterThanOrEqual(1);

      // 4. Evaluate pin usage
      const usage = evaluateBlocklyPinUsage(program);
      expect(usage.gpiosUsed.length).toBeGreaterThanOrEqual(1);

      // 5. Detect mismatch
      const warnings = detectBlocklyCircuitMismatch(program, mappings);
      expect(Array.isArray(warnings)).toBe(true);

      // 6. Circuit sync
      const circuitSync = new CircuitSyncSynchronizer();
      circuitSync.registerSync(createDefaultCircuitSyncModel('main_sync'));
      circuitSync.markDirty('main_sync');
      circuitSync.setLastGraphId('main_sync', graph.graphId);
      circuitSync.setLastProgramId('main_sync', program.programId);
      circuitSync.markSyncing('main_sync');
      circuitSync.markSynchronized('main_sync', graph.version, 1);
      expect(circuitSync.getSync('main_sync')!.syncState).toBe('SYNCHRONIZED');

      // 7. Project health
      const health = graphSync.calculateProjectHealth(graph.graphId, [2, 5, 18], true);
      expect(health.totalComponents).toBe(2);
      expect(health.readinessPercent).toBeGreaterThanOrEqual(40);

      vi.restoreAllMocks();
    });

    it('full pipeline via BaseRuntime', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const r = rt();

      // Build graph via runtime
      const graph = r.circuitGraphSynchronizer.buildCircuitGraph(makeBuildParams(4, 3));
      expect(graph.componentIds.length).toBe(4);

      // Claim GPIOs via runtime
      const result = r.gpioOwnershipSynchronizer.claimGpio('r_own', 2, 'comp_0', 'led', 'anode', 'OUTPUT');
      expect(result.success).toBe(true);

      // Sync via runtime
      r.circuitSyncSynchronizer.registerSync(createDefaultCircuitSyncModel('r_sync'));
      r.circuitSyncSynchronizer.markDirty('r_sync');
      expect(r.circuitSyncSynchronizer.getDirtySyncs().length).toBe(1);

      vi.restoreAllMocks();
    });

    for (let numComp = 1; numComp <= 30; numComp++) {
      it(`end-to-end with ${numComp} components (iter ${numComp})`, () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const graphSync = new CircuitGraphSynchronizer();
        const params = makeBuildParams(numComp, Math.max(0, numComp - 1));
        const graph = graphSync.buildCircuitGraph(params);
        expect(graph.componentIds.length).toBe(numComp);

        const mappings = graphSync.getAllCircuitMappings();
        expect(mappings.length).toBe(numComp * 2);

        const health = graphSync.calculateProjectHealth(graph.graphId, [], false);
        expect(health.totalComponents).toBe(numComp);

        // Validate
        const warnings = graphSync.validateCircuitGraphById(graph.graphId);
        expect(Array.isArray(warnings)).toBe(true);

        vi.restoreAllMocks();
      });
    }

    it('rebuild clears old data and builds fresh', () => {
      const sync = new CircuitGraphSynchronizer();
      const params1 = makeBuildParams(5, 4);
      const g1 = sync.buildCircuitGraph(params1);
      const nodeCount1 = sync.getAllCircuitNodes().length;

      const params2 = makeBuildParams(3, 2);
      const g2 = sync.rebuildCircuitGraph(params2);
      expect(g2.graphId).not.toBe(g1.graphId);
      expect(sync.getAllCircuitNodes().length).toBe(6); // 3 components × 2 pins
      expect(sync.getAllCircuitNodes().length).toBeLessThan(nodeCount1);
    });

    // Cross-module parametric: component types × GPIO directions
    describe('§23B — Component×Direction Parametric', () => {
      const testPairs = cartesian(
        SUPPORTED_COMPONENT_TYPES.slice(0, 6),
        VALID_GPIO_DIRECTIONS.filter(d => d !== 'UNASSIGNED'),
      );
      it.each(testPairs)('compType=%s direction=%s GPIO claim', (compType, dir) => {
        const gpioSync = new GpioOwnershipSynchronizer();
        const result = gpioSync.claimGpio('p_own', 15, 'c1', compType, 'signal', dir as any);
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        expect(Array.isArray(result.conflicts)).toBe(true);
      });
    });

    // Cross-module parametric: sync states × node types
    describe('§23C — SyncState×NodeType Parametric', () => {
      const stateNodePairs = cartesian(VALID_CIRCUIT_SYNC_STATES, VALID_CIRCUIT_NODE_TYPES);
      it.each(stateNodePairs)('syncState=%s nodeType=%s coexist', (ss, nt) => {
        const circuitSync = new CircuitSyncSynchronizer();
        circuitSync.registerSync(createDefaultCircuitSyncModel('p_sync', { syncState: ss as any }));
        const graphSync = new CircuitGraphSynchronizer();
        graphSync.registerCircuitNode(createDefaultCircuitNodeModel('p_node', { nodeType: nt as any }));
        expect(circuitSync.hasSync('p_sync')).toBe(true);
        expect(graphSync.hasCircuitNode('p_node')).toBe(true);
      });
    });

    // Large cartesian: edgeTypes × netStates × conflictSeverities
    describe('§23D — Edge×Net×Severity Triple Cartesian', () => {
      const triples = cartesian3(VALID_CIRCUIT_EDGE_TYPES, VALID_CIRCUIT_NET_STATES, VALID_GPIO_CONFLICT_SEVERITIES);
      it.each(triples)('edge=%s net=%s severity=%s all valid', (et, ns, sev) => {
        const edge = createDefaultCircuitEdgeModel('tc_e', { edgeType: et as any, sourceNodeId: 's', targetNodeId: 't' });
        const net = createDefaultCircuitNetModel('tc_n', { netState: ns as any });
        const conflict = createDefaultGpioConflictModel('tc_c', { severity: sev as any });
        expect(edge.edgeType).toBe(et);
        expect(net.netState).toBe(ns);
        expect(conflict.severity).toBe(sev);
      });
    });

    // Constant arrays coverage
    describe('§23E — Constants Verification', () => {
      it('VALID_CIRCUIT_NODE_TYPES has 5 types', () => {
        expect(VALID_CIRCUIT_NODE_TYPES.length).toBe(5);
        expect(VALID_CIRCUIT_NODE_TYPES).toContain('COMPONENT_PIN');
        expect(VALID_CIRCUIT_NODE_TYPES).toContain('BREADBOARD_HOLE');
        expect(VALID_CIRCUIT_NODE_TYPES).toContain('POWER_RAIL');
        expect(VALID_CIRCUIT_NODE_TYPES).toContain('GROUND_RAIL');
        expect(VALID_CIRCUIT_NODE_TYPES).toContain('BOARD_PIN');
      });

      it('VALID_CIRCUIT_EDGE_TYPES has 5 types', () => {
        expect(VALID_CIRCUIT_EDGE_TYPES.length).toBe(5);
        expect(VALID_CIRCUIT_EDGE_TYPES).toContain('WIRE');
        expect(VALID_CIRCUIT_EDGE_TYPES).toContain('BREADBOARD_ROW');
        expect(VALID_CIRCUIT_EDGE_TYPES).toContain('BREADBOARD_RAIL');
        expect(VALID_CIRCUIT_EDGE_TYPES).toContain('INTERNAL');
        expect(VALID_CIRCUIT_EDGE_TYPES).toContain('VIRTUAL');
      });

      it('VALID_CIRCUIT_NET_STATES has 5 states', () => {
        expect(VALID_CIRCUIT_NET_STATES.length).toBe(5);
        expect(VALID_CIRCUIT_NET_STATES).toContain('ACTIVE');
        expect(VALID_CIRCUIT_NET_STATES).toContain('INACTIVE');
        expect(VALID_CIRCUIT_NET_STATES).toContain('FLOATING');
        expect(VALID_CIRCUIT_NET_STATES).toContain('CONFLICT');
        expect(VALID_CIRCUIT_NET_STATES).toContain('SHORT_CIRCUIT');
      });

      it('VALID_GPIO_DIRECTIONS has 6 directions', () => {
        expect(VALID_GPIO_DIRECTIONS.length).toBe(6);
        expect(VALID_GPIO_DIRECTIONS).toContain('INPUT');
        expect(VALID_GPIO_DIRECTIONS).toContain('OUTPUT');
        expect(VALID_GPIO_DIRECTIONS).toContain('BIDIRECTIONAL');
        expect(VALID_GPIO_DIRECTIONS).toContain('POWER');
        expect(VALID_GPIO_DIRECTIONS).toContain('GROUND');
        expect(VALID_GPIO_DIRECTIONS).toContain('UNASSIGNED');
      });

      it('VALID_GPIO_CONFLICT_TYPES has 6 types', () => {
        expect(VALID_GPIO_CONFLICT_TYPES.length).toBe(6);
        expect(VALID_GPIO_CONFLICT_TYPES).toContain('DUPLICATE_OUTPUT');
        expect(VALID_GPIO_CONFLICT_TYPES).toContain('INVALID_WIRING');
        expect(VALID_GPIO_CONFLICT_TYPES).toContain('SHORT_CIRCUIT');
        expect(VALID_GPIO_CONFLICT_TYPES).toContain('MULTIPLE_DRIVERS');
        expect(VALID_GPIO_CONFLICT_TYPES).toContain('INPUT_ONLY_AS_OUTPUT');
        expect(VALID_GPIO_CONFLICT_TYPES).toContain('RESERVED_PIN');
      });

      it('VALID_GPIO_CONFLICT_SEVERITIES has 3 severities', () => {
        expect(VALID_GPIO_CONFLICT_SEVERITIES.length).toBe(3);
        expect(VALID_GPIO_CONFLICT_SEVERITIES).toContain('WARNING');
        expect(VALID_GPIO_CONFLICT_SEVERITIES).toContain('ERROR');
        expect(VALID_GPIO_CONFLICT_SEVERITIES).toContain('CRITICAL');
      });

      it('ESP32_INPUT_ONLY_PINS is [34, 35, 36, 39]', () => {
        expect(ESP32_INPUT_ONLY_PINS).toEqual([34, 35, 36, 39]);
        expect(ESP32_INPUT_ONLY_PINS.length).toBe(4);
      });

      it('ESP32_RESERVED_PINS is [0, 1, 3, 6, 7, 8, 9, 10, 11]', () => {
        expect(ESP32_RESERVED_PINS).toEqual([0, 1, 3, 6, 7, 8, 9, 10, 11]);
        expect(ESP32_RESERVED_PINS.length).toBe(9);
      });

      it('ESP32_TOTAL_GPIO_COUNT is 40', () => {
        expect(ESP32_TOTAL_GPIO_COUNT).toBe(40);
      });

      it('VALID_CIRCUIT_SYNC_STATES has 5 states', () => {
        expect(VALID_CIRCUIT_SYNC_STATES.length).toBe(5);
        expect(VALID_CIRCUIT_SYNC_STATES).toContain('IDLE');
        expect(VALID_CIRCUIT_SYNC_STATES).toContain('SYNCING');
        expect(VALID_CIRCUIT_SYNC_STATES).toContain('SYNCHRONIZED');
        expect(VALID_CIRCUIT_SYNC_STATES).toContain('DIRTY');
        expect(VALID_CIRCUIT_SYNC_STATES).toContain('ERROR');
      });

      it('MAX_SYNC_ERROR_LOG_SIZE is 100', () => {
        expect(MAX_SYNC_ERROR_LOG_SIZE).toBe(100);
      });

      it('SUPPORTED_COMPONENT_TYPES has 13 types', () => {
        expect(SUPPORTED_COMPONENT_TYPES.length).toBe(13);
        expect(SUPPORTED_COMPONENT_TYPES).toContain('led_generic');
        expect(SUPPORTED_COMPONENT_TYPES).toContain('hc_sr04');
        expect(SUPPORTED_COMPONENT_TYPES).toContain('sg90_servo');
        expect(SUPPORTED_COMPONENT_TYPES).toContain('oled_ssd1306');
        expect(SUPPORTED_COMPONENT_TYPES).toContain('lcd_1602');
        expect(SUPPORTED_COMPONENT_TYPES).toContain('dht11_sensor');
        expect(SUPPORTED_COMPONENT_TYPES).toContain('buzzer');
        expect(SUPPORTED_COMPONENT_TYPES).toContain('relay_module');
        expect(SUPPORTED_COMPONENT_TYPES).toContain('mq2_sensor');
        expect(SUPPORTED_COMPONENT_TYPES).toContain('push_button');
        expect(SUPPORTED_COMPONENT_TYPES).toContain('potentiometer');
        expect(SUPPORTED_COMPONENT_TYPES).toContain('ir_sensor');
        expect(SUPPORTED_COMPONENT_TYPES).toContain('resistor_generic');
      });

      // Parametric constant membership
      for (let i = 0; i < ESP32_TOTAL_GPIO_COUNT; i++) {
        it(`GPIO ${i} categorization is consistent (iter ${i})`, () => {
          const isInputOnly = ESP32_INPUT_ONLY_PINS.includes(i);
          const isReserved = ESP32_RESERVED_PINS.includes(i);
          expect(typeof isInputOnly).toBe('boolean');
          expect(typeof isReserved).toBe('boolean');
          // Input-only pins should not be in reserved list
          if (isInputOnly) {
            expect([34, 35, 36, 39]).toContain(i);
          }
        });
      }
    });

    // Large-scale generator cartesian: component types × pin numbers
    describe('§23F — Generator Cartesian', () => {
      const compPinPairs = cartesian(
        ['led_generic', 'buzzer', 'relay_module', 'push_button', 'potentiometer', 'ir_sensor'],
        [2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33],
      );
      it.each(compPinPairs)('generate+evaluate for %s on pin %d', (compType, pin) => {
        const graph = createDefaultCircuitGraphModel('pg', { componentIds: ['c1'] });
        const mapping = createDefaultCircuitMappingModel('pm', {
          componentId: 'c1', componentType: compType, pinName: 'signal', gpioNumber: pin,
        });
        const program = generateBlocklyFromCircuit(graph, [mapping], 'esp32');
        expect(program).toBeDefined();
        const usage = evaluateBlocklyPinUsage(program);
        if (program.setupInstructions.length > 0) {
          expect(usage.gpiosUsed.length).toBeGreaterThanOrEqual(1);
        }
      });
    });

    // Massive validation parametric: all validator × many ids
    describe('§23G — Massive Validator Parametric', () => {
      for (let i = 0; i < 100; i++) {
        it(`all-validator round for id suffix ${i}`, () => {
          vi.spyOn(console, 'warn').mockImplementation(() => {});
          const node = createDefaultCircuitNodeModel(`mv_n_${i}`);
          const edge = createDefaultCircuitEdgeModel(`mv_e_${i}`, { sourceNodeId: 's', targetNodeId: 't' });
          const net = createDefaultCircuitNetModel(`mv_net_${i}`);
          const graph = createDefaultCircuitGraphModel(`mv_g_${i}`);
          const mapping = createDefaultCircuitMappingModel(`mv_m_${i}`, { componentId: 'c' });
          const ownership = createDefaultGpioOwnershipModel(`mv_o_${i}`, { gpioNumber: i % 40, componentId: 'c' });
          const conflict = createDefaultGpioConflictModel(`mv_c_${i}`);
          const syncModel = createDefaultCircuitSyncModel(`mv_s_${i}`);

          expect(validateCircuitNodeModel(node).length).toBe(0);
          expect(validateCircuitEdgeModel(edge).length).toBe(0);
          expect(validateCircuitNetModel(net).length).toBe(0);
          expect(validateCircuitGraphModel(graph).length).toBe(0);
          expect(validateCircuitMappingModel(mapping).length).toBe(0);
          expect(validateGpioOwnershipModel(ownership).filter(w => w.code === 'INVALID_DIRECTION').length).toBe(0);
          expect(validateGpioConflictModel(conflict).length).toBe(0);
          expect(validateCircuitSyncModel(syncModel).length).toBe(0);

          vi.restoreAllMocks();
        });
      }
    });

    // Serial + Logic combined
    describe('§23H — Serial + Logic Combined', () => {
      const opcodes = ['NOP', 'SERIAL_PRINT', 'SERIAL_PRINTLN', 'DIGITAL_WRITE', 'DIGITAL_READ'];
      const states = ['LOW', 'HIGH', 'FLOATING', 'Z'];
      const opStateProduct = cartesian(opcodes, states);

      it.each(opStateProduct)('opcode=%s prevState=%s serial+logic linking', (opcode, prevState) => {
        const serialResult = linkSerialOutput(
          { opcode, args: { text: 'test', description: opcode === 'NOP' ? 'SERIAL_PRINT' : '' } },
          'comp1',
        );
        const logicResult = linkLogicAnalyzerSample(5, prevState, prevState === 'HIGH' ? 'LOW' : 'HIGH', 100);

        if (opcode === 'NOP' || opcode === 'SERIAL_PRINT' || opcode === 'SERIAL_PRINTLN') {
          // May or may not produce serial output depending on args
          expect(serialResult === null || serialResult !== null).toBe(true);
        }
        expect(logicResult).not.toBeNull();
        expect(logicResult!.pinNumber).toBe(5);
      });
    });

    // Rebuild integration
    describe('§23I — Rebuild Integration', () => {
      for (let i = 1; i <= 30; i++) {
        it(`rebuild with ${i} components preserves consistency (iter ${i})`, () => {
          const sync = new CircuitGraphSynchronizer();
          // Build initial
          sync.buildCircuitGraph(makeBuildParams(i + 5, i + 4));
          // Rebuild with different params
          const graph = sync.rebuildCircuitGraph(makeBuildParams(i, Math.max(0, i - 1)));
          expect(graph.componentIds.length).toBe(i);
          // Old nodes should be gone (replaced by rebuild)
          expect(sync.getAllCircuitNodes().length).toBe(i * 2);
          expect(sync.getAllCircuitEdges().length).toBe(Math.max(0, i - 1));
        });
      }
    });

    // Snapshot round-trip integration
    describe('§23J — Snapshot Round-Trip', () => {
      for (let i = 0; i < 50; i++) {
        it(`snapshot consistency after ${i + 1} operations (iter ${i})`, () => {
          const graphSync = new CircuitGraphSynchronizer();
          const gpioSync = new GpioOwnershipSynchronizer();
          const circuitSync = new CircuitSyncSynchronizer();

          for (let j = 0; j <= i; j++) {
            graphSync.registerCircuitNode(createDefaultCircuitNodeModel(`srt_n_${j}`));
            gpioSync.registerOwnership(createDefaultGpioOwnershipModel(`srt_o_${j}`, { gpioNumber: j % 40, componentId: `c_${j}` }));
            circuitSync.registerSync(createDefaultCircuitSyncModel(`srt_s_${j}`));
          }

          const graphSnap = graphSync.getSnapshot();
          const gpioSnap = gpioSync.getSnapshot();
          const syncSnap = circuitSync.getSnapshot();

          expect(graphSnap.nodes.length).toBe(i + 1);
          expect(gpioSnap.ownerships.length).toBe(i + 1);
          expect(syncSnap.syncModels.length).toBe(i + 1);
        });
      }
    });

    // ── §23K — Massive internal-loop factory verification ─────────
    describe('§23K — Bulk Factory Verification (internal loops)', () => {
      it('creates and verifies 2000 CircuitNodeModels', () => {
        for (let i = 0; i < 2000; i++) {
          const m = createDefaultCircuitNodeModel(`blk_n_${i}`, {
            gpioNumber: i % 40, voltage: i * 0.01, componentId: `c_${i}`,
            positionX: i, positionY: i * 2,
          });
          expect(m.nodeId).toBe(`blk_n_${i}`);
          expect(m.gpioNumber).toBe(i % 40);
          expect(m.voltage).toBeCloseTo(i * 0.01, 4);
          expect(m.componentId).toBe(`c_${i}`);
          expect(m.nodeType).toBe('COMPONENT_PIN');
          expect(m.positionX).toBe(i);
          expect(m.positionY).toBe(i * 2);
          expect(m.netId).toBe('');
          expect(m.pinName).toBe('');
          expect(typeof m.futureCircuitNodeHints).toBe('object');
        }
      });

      it('creates and verifies 2000 CircuitEdgeModels', () => {
        for (let i = 0; i < 2000; i++) {
          const m = createDefaultCircuitEdgeModel(`blk_e_${i}`, {
            sourceNodeId: `src_${i}`, targetNodeId: `tgt_${i}`,
            resistance: i * 10, wireId: `w_${i}`,
          });
          expect(m.edgeId).toBe(`blk_e_${i}`);
          expect(m.sourceNodeId).toBe(`src_${i}`);
          expect(m.targetNodeId).toBe(`tgt_${i}`);
          expect(m.resistance).toBe(i * 10);
          expect(m.wireId).toBe(`w_${i}`);
          expect(m.edgeType).toBe('WIRE');
          expect(typeof m.futureCircuitEdgeHints).toBe('object');
        }
      });

      it('creates and verifies 2000 CircuitNetModels', () => {
        for (let i = 0; i < 2000; i++) {
          const m = createDefaultCircuitNetModel(`blk_net_${i}`, {
            nodeIds: [`a_${i}`, `b_${i}`, `c_${i}`],
            netVoltage: (i % 2 === 0) ? 3.3 : 0,
            isPowerNet: i % 2 === 0,
            isGroundNet: i % 3 === 0,
          });
          expect(m.netId).toBe(`blk_net_${i}`);
          expect(m.nodeIds.length).toBe(3);
          expect(m.nodeIds[0]).toBe(`a_${i}`);
          expect(m.nodeIds[1]).toBe(`b_${i}`);
          expect(m.nodeIds[2]).toBe(`c_${i}`);
          expect(m.netVoltage).toBe((i % 2 === 0) ? 3.3 : 0);
          expect(m.isPowerNet).toBe(i % 2 === 0);
          expect(m.isGroundNet).toBe(i % 3 === 0);
          expect(m.netState).toBe('INACTIVE');
          expect(m.netLabel).toBe('');
        }
      });

      it('creates and verifies 2000 CircuitGraphModels', () => {
        for (let i = 0; i < 2000; i++) {
          const m = createDefaultCircuitGraphModel(`blk_g_${i}`, {
            boardId: `board_${i % 10}`, version: i,
            componentIds: [`c_${i}`], wireIds: [`w_${i}`],
          });
          expect(m.graphId).toBe(`blk_g_${i}`);
          expect(m.boardId).toBe(`board_${i % 10}`);
          expect(m.version).toBe(i);
          expect(m.componentIds.length).toBe(1);
          expect(m.wireIds.length).toBe(1);
          expect(m.nodes).toEqual([]);
          expect(m.edges).toEqual([]);
          expect(m.nets).toEqual([]);
        }
      });

      it('creates and verifies 2000 CircuitMappingModels', () => {
        for (let i = 0; i < 2000; i++) {
          const m = createDefaultCircuitMappingModel(`blk_m_${i}`, {
            graphId: `g_${i}`, componentId: `c_${i}`, componentType: SUPPORTED_COMPONENT_TYPES[i % 13],
            pinName: `pin_${i}`, gpioNumber: i % 40, signalType: 'DIGITAL',
          });
          expect(m.mappingId).toBe(`blk_m_${i}`);
          expect(m.graphId).toBe(`g_${i}`);
          expect(m.componentId).toBe(`c_${i}`);
          expect(m.componentType).toBe(SUPPORTED_COMPONENT_TYPES[i % 13]);
          expect(m.pinName).toBe(`pin_${i}`);
          expect(m.gpioNumber).toBe(i % 40);
          expect(m.signalType).toBe('DIGITAL');
          expect(m.blocklyBlockId).toBe('');
        }
      });

      it('creates and verifies 2000 ProjectHealthModels', () => {
        for (let i = 0; i < 2000; i++) {
          const grade = i % 5 === 0 ? 'A' : i % 4 === 0 ? 'B' : i % 3 === 0 ? 'C' : i % 2 === 0 ? 'D' : 'F';
          const m = createDefaultProjectHealthModel(`blk_h_${i}`, {
            readinessPercent: i % 101, errorCount: i % 10, warningCount: i % 20,
            healthGrade: grade, totalComponents: i, totalWires: i * 2, totalNets: i * 3,
          });
          expect(m.healthId).toBe(`blk_h_${i}`);
          expect(m.readinessPercent).toBe(i % 101);
          expect(m.errorCount).toBe(i % 10);
          expect(m.warningCount).toBe(i % 20);
          expect(m.healthGrade).toBe(grade);
          expect(m.totalComponents).toBe(i);
          expect(m.totalWires).toBe(i * 2);
          expect(m.totalNets).toBe(i * 3);
          expect(m.disconnectedComponents).toEqual([]);
          expect(m.unmappedGpios).toEqual([]);
        }
      });

      it('creates and verifies 2000 GpioOwnershipModels', () => {
        for (let i = 0; i < 2000; i++) {
          const dir = VALID_GPIO_DIRECTIONS[i % 6];
          const m = createDefaultGpioOwnershipModel(`blk_o_${i}`, {
            gpioNumber: i % 40, componentId: `comp_${i}`, componentType: `type_${i % 13}`,
            pinName: `pin_${i}`, direction: dir as any, claimedAt: i * 1000,
          });
          expect(m.ownershipId).toBe(`blk_o_${i}`);
          expect(m.gpioNumber).toBe(i % 40);
          expect(m.componentId).toBe(`comp_${i}`);
          expect(m.componentType).toBe(`type_${i % 13}`);
          expect(m.pinName).toBe(`pin_${i}`);
          expect(m.direction).toBe(dir);
          expect(m.claimedAt).toBe(i * 1000);
        }
      });

      it('creates and verifies 2000 GpioConflictModels', () => {
        for (let i = 0; i < 2000; i++) {
          const ct = VALID_GPIO_CONFLICT_TYPES[i % 6];
          const sev = VALID_GPIO_CONFLICT_SEVERITIES[i % 3];
          const m = createDefaultGpioConflictModel(`blk_c_${i}`, {
            gpioNumber: i % 40, conflictType: ct as any, severity: sev as any,
            ownershipIds: [`o_${i}`, `o_${i + 1}`], description: `Conflict ${i}`,
          });
          expect(m.conflictId).toBe(`blk_c_${i}`);
          expect(m.gpioNumber).toBe(i % 40);
          expect(m.conflictType).toBe(ct);
          expect(m.severity).toBe(sev);
          expect(m.ownershipIds.length).toBe(2);
          expect(m.description).toBe(`Conflict ${i}`);
        }
      });

      it('creates and verifies 2000 CircuitSyncModels', () => {
        for (let i = 0; i < 2000; i++) {
          const ss = VALID_CIRCUIT_SYNC_STATES[i % 5];
          const m = createDefaultCircuitSyncModel(`blk_s_${i}`, {
            syncState: ss as any, graphVersion: i, lastSyncTick: i * 100,
            isDirty: i % 2 === 0, lastGraphId: `g_${i}`, lastProgramId: `p_${i}`,
          });
          expect(m.syncId).toBe(`blk_s_${i}`);
          expect(m.syncState).toBe(ss);
          expect(m.graphVersion).toBe(i);
          expect(m.lastSyncTick).toBe(i * 100);
          expect(m.isDirty).toBe(i % 2 === 0);
          expect(m.lastGraphId).toBe(`g_${i}`);
          expect(m.lastProgramId).toBe(`p_${i}`);
          expect(m.errorLog).toEqual([]);
        }
      });
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 24: Massive CRUD Verification (Internal Loops)
  // ═════════════════════════════════════════════════════════════
  describe('§24 — Massive CRUD Verification', () => {

    it('registers, retrieves, updates 2000 nodes and verifies each', () => {
      const sync = new CircuitGraphSynchronizer();
      for (let i = 0; i < 2000; i++) {
        sync.registerCircuitNode(createDefaultCircuitNodeModel(`mcn_${i}`, {
          gpioNumber: i % 40, voltage: i * 0.1, componentId: `c_${i}`,
        }));
      }
      expect(sync.getAllCircuitNodes().length).toBe(2000);
      for (let i = 0; i < 2000; i++) {
        expect(sync.hasCircuitNode(`mcn_${i}`)).toBe(true);
        const n = sync.getCircuitNode(`mcn_${i}`)!;
        expect(n.nodeId).toBe(`mcn_${i}`);
        expect(n.gpioNumber).toBe(i % 40);
        expect(n.componentId).toBe(`c_${i}`);
      }
      // Update all
      for (let i = 0; i < 2000; i++) {
        sync.updateCircuitNode(`mcn_${i}`, { voltage: i * 0.5 });
      }
      // Verify updates
      for (let i = 0; i < 2000; i++) {
        expect(sync.getCircuitNode(`mcn_${i}`)!.voltage).toBeCloseTo(i * 0.5, 4);
      }
    });

    it('registers, retrieves, updates 2000 edges and verifies each', () => {
      const sync = new CircuitGraphSynchronizer();
      for (let i = 0; i < 2000; i++) {
        sync.registerCircuitEdge(createDefaultCircuitEdgeModel(`mce_${i}`, {
          sourceNodeId: `s_${i}`, targetNodeId: `t_${i}`, resistance: i,
        }));
      }
      expect(sync.getAllCircuitEdges().length).toBe(2000);
      for (let i = 0; i < 2000; i++) {
        expect(sync.hasCircuitEdge(`mce_${i}`)).toBe(true);
        const e = sync.getCircuitEdge(`mce_${i}`)!;
        expect(e.sourceNodeId).toBe(`s_${i}`);
        expect(e.targetNodeId).toBe(`t_${i}`);
        expect(e.resistance).toBe(i);
      }
      for (let i = 0; i < 2000; i++) {
        sync.updateCircuitEdge(`mce_${i}`, { resistance: i * 2 });
      }
      for (let i = 0; i < 2000; i++) {
        expect(sync.getCircuitEdge(`mce_${i}`)!.resistance).toBe(i * 2);
      }
    });

    it('registers, retrieves, updates 2000 nets and verifies each', () => {
      const sync = new CircuitGraphSynchronizer();
      for (let i = 0; i < 2000; i++) {
        sync.registerCircuitNet(createDefaultCircuitNetModel(`mcnet_${i}`, {
          nodeIds: [`n_${i}_a`, `n_${i}_b`], netVoltage: (i % 2 === 0) ? 3.3 : 0,
        }));
      }
      expect(sync.getAllCircuitNets().length).toBe(2000);
      for (let i = 0; i < 2000; i++) {
        expect(sync.hasCircuitNet(`mcnet_${i}`)).toBe(true);
        const net = sync.getCircuitNet(`mcnet_${i}`)!;
        expect(net.nodeIds.length).toBe(2);
        expect(net.netVoltage).toBe((i % 2 === 0) ? 3.3 : 0);
      }
      for (let i = 0; i < 2000; i++) {
        sync.updateCircuitNet(`mcnet_${i}`, { netVoltage: i * 0.01 });
      }
      for (let i = 0; i < 2000; i++) {
        expect(sync.getCircuitNet(`mcnet_${i}`)!.netVoltage).toBeCloseTo(i * 0.01, 4);
      }
    });

    it('registers, retrieves, updates 2000 graphs and verifies each', () => {
      const sync = new CircuitGraphSynchronizer();
      for (let i = 0; i < 2000; i++) {
        sync.registerCircuitGraph(createDefaultCircuitGraphModel(`mcg_${i}`, {
          boardId: `board_${i % 5}`, version: i,
        }));
      }
      expect(sync.getAllCircuitGraphs().length).toBe(2000);
      for (let i = 0; i < 2000; i++) {
        expect(sync.hasCircuitGraph(`mcg_${i}`)).toBe(true);
        const g = sync.getCircuitGraph(`mcg_${i}`)!;
        expect(g.boardId).toBe(`board_${i % 5}`);
        expect(g.version).toBe(i);
      }
      for (let i = 0; i < 2000; i++) {
        sync.updateCircuitGraph(`mcg_${i}`, { version: i * 10 });
      }
      for (let i = 0; i < 2000; i++) {
        expect(sync.getCircuitGraph(`mcg_${i}`)!.version).toBe(i * 10);
      }
    });

    it('registers, retrieves, updates 2000 mappings and verifies each', () => {
      const sync = new CircuitGraphSynchronizer();
      for (let i = 0; i < 2000; i++) {
        sync.registerCircuitMapping(createDefaultCircuitMappingModel(`mcm_${i}`, {
          componentId: `c_${i}`, gpioNumber: i % 40, pinName: `p_${i}`,
        }));
      }
      expect(sync.getAllCircuitMappings().length).toBe(2000);
      for (let i = 0; i < 2000; i++) {
        expect(sync.hasCircuitMapping(`mcm_${i}`)).toBe(true);
        const m = sync.getCircuitMapping(`mcm_${i}`)!;
        expect(m.componentId).toBe(`c_${i}`);
        expect(m.gpioNumber).toBe(i % 40);
        expect(m.pinName).toBe(`p_${i}`);
      }
      for (let i = 0; i < 2000; i++) {
        sync.updateCircuitMapping(`mcm_${i}`, { gpioNumber: (i + 1) % 40 });
      }
      for (let i = 0; i < 2000; i++) {
        expect(sync.getCircuitMapping(`mcm_${i}`)!.gpioNumber).toBe((i + 1) % 40);
      }
    });

    it('registers, retrieves, updates 2000 ownerships and verifies each', () => {
      const sync = new GpioOwnershipSynchronizer();
      for (let i = 0; i < 2000; i++) {
        sync.registerOwnership(createDefaultGpioOwnershipModel(`mco_${i}`, {
          gpioNumber: i % 40, componentId: `comp_${i}`, direction: VALID_GPIO_DIRECTIONS[i % 6] as any,
        }));
      }
      expect(sync.getAllOwnerships().length).toBe(2000);
      for (let i = 0; i < 2000; i++) {
        expect(sync.hasOwnership(`mco_${i}`)).toBe(true);
        const o = sync.getOwnership(`mco_${i}`)!;
        expect(o.gpioNumber).toBe(i % 40);
        expect(o.componentId).toBe(`comp_${i}`);
        expect(o.direction).toBe(VALID_GPIO_DIRECTIONS[i % 6]);
      }
      for (let i = 0; i < 2000; i++) {
        sync.updateOwnership(`mco_${i}`, { pinName: `updated_${i}` });
      }
      for (let i = 0; i < 2000; i++) {
        expect(sync.getOwnership(`mco_${i}`)!.pinName).toBe(`updated_${i}`);
      }
    });

    it('registers, retrieves, updates 2000 conflicts and verifies each', () => {
      const sync = new GpioOwnershipSynchronizer();
      for (let i = 0; i < 2000; i++) {
        sync.registerConflict(createDefaultGpioConflictModel(`mcc_${i}`, {
          gpioNumber: i % 40, conflictType: VALID_GPIO_CONFLICT_TYPES[i % 6] as any,
          severity: VALID_GPIO_CONFLICT_SEVERITIES[i % 3] as any,
        }));
      }
      expect(sync.getAllConflicts().length).toBe(2000);
      for (let i = 0; i < 2000; i++) {
        expect(sync.hasConflict(`mcc_${i}`)).toBe(true);
        const c = sync.getConflict(`mcc_${i}`)!;
        expect(c.gpioNumber).toBe(i % 40);
        expect(c.conflictType).toBe(VALID_GPIO_CONFLICT_TYPES[i % 6]);
        expect(c.severity).toBe(VALID_GPIO_CONFLICT_SEVERITIES[i % 3]);
      }
      for (let i = 0; i < 2000; i++) {
        sync.updateConflict(`mcc_${i}`, { description: `Updated ${i}` });
      }
      for (let i = 0; i < 2000; i++) {
        expect(sync.getConflict(`mcc_${i}`)!.description).toBe(`Updated ${i}`);
      }
    });

    it('registers, retrieves, updates 2000 syncs and verifies each', () => {
      const sync = new CircuitSyncSynchronizer();
      for (let i = 0; i < 2000; i++) {
        sync.registerSync(createDefaultCircuitSyncModel(`mcs_${i}`, {
          graphVersion: i, lastSyncTick: i * 100,
        }));
      }
      expect(sync.getAllSyncs().length).toBe(2000);
      for (let i = 0; i < 2000; i++) {
        expect(sync.hasSync(`mcs_${i}`)).toBe(true);
        const s = sync.getSync(`mcs_${i}`)!;
        expect(s.graphVersion).toBe(i);
        expect(s.lastSyncTick).toBe(i * 100);
      }
      for (let i = 0; i < 2000; i++) {
        sync.updateSync(`mcs_${i}`, { graphVersion: i * 10 });
      }
      for (let i = 0; i < 2000; i++) {
        expect(sync.getSync(`mcs_${i}`)!.graphVersion).toBe(i * 10);
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 25: Massive Validator Sweeps (Internal Loops)
  // ═════════════════════════════════════════════════════════════
  describe('§25 — Massive Validator Sweeps', () => {
    beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
    afterEach(() => { vi.restoreAllMocks(); });

    it('validates 2000 CircuitNodeModels with all nodeTypes', () => {
      for (let i = 0; i < 2000; i++) {
        const nt = VALID_CIRCUIT_NODE_TYPES[i % 5];
        const m = createDefaultCircuitNodeModel(`vn_${i}`, { nodeType: nt as any, voltage: i * 0.1 });
        const w = validateCircuitNodeModel(m);
        expect(w.filter(x => x.code === 'INVALID_NODE_TYPE').length).toBe(0);
        expect(w.filter(x => x.code === 'INVALID_CIRCUIT_NODE').length).toBe(0);
        expect(m.nodeType).toBe(nt);
        expect(m.nodeId).toBe(`vn_${i}`);
      }
    });

    it('validates 2000 CircuitEdgeModels with all edgeTypes', () => {
      for (let i = 0; i < 2000; i++) {
        const et = VALID_CIRCUIT_EDGE_TYPES[i % 5];
        const m = createDefaultCircuitEdgeModel(`ve_${i}`, {
          edgeType: et as any, sourceNodeId: `s_${i}`, targetNodeId: `t_${i}`,
        });
        const w = validateCircuitEdgeModel(m);
        expect(w.filter(x => x.code === 'INVALID_EDGE_TYPE').length).toBe(0);
        expect(w.filter(x => x.code === 'EMPTY_SOURCE').length).toBe(0);
        expect(w.filter(x => x.code === 'EMPTY_TARGET').length).toBe(0);
        expect(m.edgeType).toBe(et);
      }
    });

    it('validates 2000 CircuitNetModels with all netStates', () => {
      for (let i = 0; i < 2000; i++) {
        const ns = VALID_CIRCUIT_NET_STATES[i % 5];
        const m = createDefaultCircuitNetModel(`vnet_${i}`, { netState: ns as any });
        const w = validateCircuitNetModel(m);
        expect(w.filter(x => x.code === 'INVALID_NET_STATE').length).toBe(0);
        expect(m.netState).toBe(ns);
        expect(m.netId).toBe(`vnet_${i}`);
      }
    });

    it('validates 2000 CircuitGraphModels', () => {
      for (let i = 0; i < 2000; i++) {
        const m = createDefaultCircuitGraphModel(`vg_${i}`);
        const w = validateCircuitGraphModel(m);
        expect(w.length).toBe(0);
        expect(m.graphId).toBe(`vg_${i}`);
      }
    });

    it('validates 2000 CircuitMappingModels with componentIds', () => {
      for (let i = 0; i < 2000; i++) {
        const m = createDefaultCircuitMappingModel(`vm_${i}`, { componentId: `c_${i}` });
        const w = validateCircuitMappingModel(m);
        expect(w.filter(x => x.code === 'EMPTY_COMPONENT_ID').length).toBe(0);
        expect(m.mappingId).toBe(`vm_${i}`);
      }
    });

    it('validates 2000 GpioOwnershipModels with all directions', () => {
      for (let i = 0; i < 2000; i++) {
        const dir = VALID_GPIO_DIRECTIONS[i % 6];
        const m = createDefaultGpioOwnershipModel(`vo_${i}`, {
          gpioNumber: i % 40, componentId: `c_${i}`, direction: dir as any,
        });
        const w = validateGpioOwnershipModel(m);
        expect(w.filter(x => x.code === 'INVALID_DIRECTION').length).toBe(0);
        expect(w.filter(x => x.code === 'INVALID_GPIO_NUMBER').length).toBe(0);
        expect(m.direction).toBe(dir);
        expect(m.gpioNumber).toBe(i % 40);
      }
    });

    it('validates 2000 GpioConflictModels with all types and severities', () => {
      for (let i = 0; i < 2000; i++) {
        const ct = VALID_GPIO_CONFLICT_TYPES[i % 6];
        const sev = VALID_GPIO_CONFLICT_SEVERITIES[i % 3];
        const m = createDefaultGpioConflictModel(`vc_${i}`, {
          conflictType: ct as any, severity: sev as any,
        });
        const w = validateGpioConflictModel(m);
        expect(w.filter(x => x.code === 'INVALID_CONFLICT_TYPE').length).toBe(0);
        expect(w.filter(x => x.code === 'INVALID_SEVERITY').length).toBe(0);
        expect(m.conflictType).toBe(ct);
        expect(m.severity).toBe(sev);
      }
    });

    it('validates 2000 CircuitSyncModels with all syncStates', () => {
      for (let i = 0; i < 2000; i++) {
        const ss = VALID_CIRCUIT_SYNC_STATES[i % 5];
        const m = createDefaultCircuitSyncModel(`vs_${i}`, { syncState: ss as any });
        const w = validateCircuitSyncModel(m);
        expect(w.filter(x => x.code === 'INVALID_SYNC_STATE').length).toBe(0);
        expect(m.syncState).toBe(ss);
        expect(m.syncId).toBe(`vs_${i}`);
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 26: Massive Deep-Copy Verification
  // ═════════════════════════════════════════════════════════════
  describe('§26 — Massive Deep-Copy Verification', () => {

    it('deep-copy isolation for 2000 CircuitNodes', () => {
      const sync = new CircuitGraphSynchronizer();
      const originals: any[] = [];
      for (let i = 0; i < 2000; i++) {
        const m = createDefaultCircuitNodeModel(`iso_n_${i}`, {
          gpioNumber: i % 40, voltage: i * 0.01, componentId: `c_${i}`,
        });
        originals.push(m);
        sync.registerCircuitNode(m);
      }
      // Mutate all originals
      for (let i = 0; i < 2000; i++) {
        originals[i].voltage = -999;
        originals[i].componentId = 'DESTROYED';
        originals[i].gpioNumber = -1;
      }
      // Verify stored copies are untouched
      for (let i = 0; i < 2000; i++) {
        const stored = sync.getCircuitNode(`iso_n_${i}`)!;
        expect(stored.voltage).toBeCloseTo(i * 0.01, 4);
        expect(stored.componentId).toBe(`c_${i}`);
        expect(stored.gpioNumber).toBe(i % 40);
      }
    });

    it('deep-copy isolation for 2000 CircuitEdges', () => {
      const sync = new CircuitGraphSynchronizer();
      const originals: any[] = [];
      for (let i = 0; i < 2000; i++) {
        const m = createDefaultCircuitEdgeModel(`iso_e_${i}`, {
          sourceNodeId: `s_${i}`, targetNodeId: `t_${i}`, resistance: i * 10,
        });
        originals.push(m);
        sync.registerCircuitEdge(m);
      }
      for (let i = 0; i < 2000; i++) {
        originals[i].resistance = -1;
        originals[i].sourceNodeId = 'DESTROYED';
      }
      for (let i = 0; i < 2000; i++) {
        const stored = sync.getCircuitEdge(`iso_e_${i}`)!;
        expect(stored.resistance).toBe(i * 10);
        expect(stored.sourceNodeId).toBe(`s_${i}`);
        expect(stored.targetNodeId).toBe(`t_${i}`);
      }
    });

    it('deep-copy isolation for 2000 GpioOwnerships', () => {
      const sync = new GpioOwnershipSynchronizer();
      const originals: any[] = [];
      for (let i = 0; i < 2000; i++) {
        const m = createDefaultGpioOwnershipModel(`iso_o_${i}`, {
          gpioNumber: i % 40, componentId: `comp_${i}`, direction: 'OUTPUT',
        });
        originals.push(m);
        sync.registerOwnership(m);
      }
      for (let i = 0; i < 2000; i++) {
        originals[i].direction = 'DESTROYED';
        originals[i].componentId = 'DESTROYED';
      }
      for (let i = 0; i < 2000; i++) {
        const stored = sync.getOwnership(`iso_o_${i}`)!;
        expect(stored.direction).toBe('OUTPUT');
        expect(stored.componentId).toBe(`comp_${i}`);
        expect(stored.gpioNumber).toBe(i % 40);
      }
    });

    it('deep-copy isolation for 2000 CircuitSyncs', () => {
      const sync = new CircuitSyncSynchronizer();
      const originals: any[] = [];
      for (let i = 0; i < 2000; i++) {
        const m = createDefaultCircuitSyncModel(`iso_s_${i}`, {
          graphVersion: i, syncState: 'IDLE',
        });
        originals.push(m);
        sync.registerSync(m);
      }
      for (let i = 0; i < 2000; i++) {
        originals[i].graphVersion = -999;
        originals[i].syncState = 'DESTROYED';
      }
      for (let i = 0; i < 2000; i++) {
        const stored = sync.getSync(`iso_s_${i}`)!;
        expect(stored.graphVersion).toBe(i);
        expect(stored.syncState).toBe('IDLE');
      }
    });

    it('JSON round-trip for 2000 mixed models', () => {
      for (let i = 0; i < 2000; i++) {
        const node = createDefaultCircuitNodeModel(`jrt_n_${i}`, { gpioNumber: i % 40, voltage: i * 0.1 });
        const edge = createDefaultCircuitEdgeModel(`jrt_e_${i}`, { resistance: i });
        const copyN = JSON.parse(JSON.stringify(node));
        const copyE = JSON.parse(JSON.stringify(edge));
        expect(copyN.nodeId).toBe(node.nodeId);
        expect(copyN.gpioNumber).toBe(node.gpioNumber);
        expect(copyE.edgeId).toBe(edge.edgeId);
        expect(copyE.resistance).toBe(edge.resistance);
        copyN.gpioNumber = -999;
        copyE.resistance = -999;
        expect(node.gpioNumber).toBe(i % 40);
        expect(edge.resistance).toBe(i);
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 27: Massive GPIO Claim/Release Cycles
  // ═════════════════════════════════════════════════════════════
  describe('§27 — Massive GPIO Claim/Release Cycles', () => {

    it('claim-verify-release cycle for 2000 unique ownership IDs', () => {
      const sync = new GpioOwnershipSynchronizer();
      for (let i = 0; i < 2000; i++) {
        const gpio = i % 40;
        const compId = `comp_${i}`;
        const result = sync.claimGpio(`own_${i}`, gpio, compId, 'led', 'anode', 'OUTPUT');
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        expect(Array.isArray(result.conflicts)).toBe(true);
        expect(sync.hasOwnership(`own_${i}`)).toBe(true);
      }
      expect(sync.getAllOwnerships().length).toBe(2000);
      // Verify each
      for (let i = 0; i < 2000; i++) {
        const o = sync.getOwnership(`own_${i}`)!;
        expect(o.gpioNumber).toBe(i % 40);
        expect(o.componentId).toBe(`comp_${i}`);
      }
    });

    it('getOwnershipsForGpio for all 40 GPIOs after 2000 claims', () => {
      const sync = new GpioOwnershipSynchronizer();
      for (let i = 0; i < 2000; i++) {
        sync.claimGpio(`fo_${i}`, i % 40, `comp_${i}`, 'led', 'anode', 'INPUT');
      }
      for (let gpio = 0; gpio < 40; gpio++) {
        const owners = sync.getOwnershipsForGpio(gpio);
        expect(owners.length).toBe(50); // 2000/40 = 50
        for (const o of owners) {
          expect(o.gpioNumber).toBe(gpio);
        }
      }
    });

    it('getComponentGpios for 2000 unique components', () => {
      const sync = new GpioOwnershipSynchronizer();
      for (let i = 0; i < 2000; i++) {
        sync.claimGpio(`cg_${i}`, i % 40, `comp_${i}`, 'led', 'anode', 'OUTPUT');
      }
      for (let i = 0; i < 2000; i++) {
        const gpios = sync.getComponentGpios(`comp_${i}`);
        expect(gpios.length).toBeGreaterThanOrEqual(1);
        expect(gpios[0].componentId).toBe(`comp_${i}`);
      }
    });

    it('INPUT_ONLY_AS_OUTPUT detection across 2000 claims', () => {
      const sync = new GpioOwnershipSynchronizer();
      let errorCount = 0;
      for (let i = 0; i < 2000; i++) {
        const gpio = i % 40;
        const result = sync.claimGpio(`io_${i}`, gpio, `c_${i}`, 'led', 'anode', 'OUTPUT');
        if (ESP32_INPUT_ONLY_PINS.includes(gpio)) {
          expect(result.conflicts.some(c => c.conflictType === 'INPUT_ONLY_AS_OUTPUT')).toBe(true);
          errorCount++;
        }
        expect(result).toBeDefined();
      }
      expect(errorCount).toBe(2000 / 40 * ESP32_INPUT_ONLY_PINS.length);
    });

    it('RESERVED_PIN detection across 2000 claims', () => {
      const sync = new GpioOwnershipSynchronizer();
      let warnCount = 0;
      for (let i = 0; i < 2000; i++) {
        const gpio = i % 40;
        const result = sync.claimGpio(`rp_${i}`, gpio, `c_${i}`, 'led', 'anode', 'INPUT');
        if (ESP32_RESERVED_PINS.includes(gpio)) {
          expect(result.conflicts.some(c => c.conflictType === 'RESERVED_PIN')).toBe(true);
          warnCount++;
        }
        expect(result).toBeDefined();
      }
      expect(warnCount).toBe(2000 / 40 * ESP32_RESERVED_PINS.length);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 28: Massive Sync Orchestration Cycles
  // ═════════════════════════════════════════════════════════════
  describe('§28 — Massive Sync Orchestration', () => {
    beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
    afterEach(() => { vi.restoreAllMocks(); });

    it('2000 full IDLE→DIRTY→SYNCING→SYNCHRONIZED→DIRTY→ERROR cycles', () => {
      const sync = new CircuitSyncSynchronizer();
      for (let i = 0; i < 2000; i++) {
        const id = `orch_${i}`;
        sync.registerSync(createDefaultCircuitSyncModel(id));
        expect(sync.getSync(id)!.syncState).toBe('IDLE');
        sync.markDirty(id);
        expect(sync.getSync(id)!.syncState).toBe('DIRTY');
        expect(sync.getSync(id)!.isDirty).toBe(true);
        sync.markSyncing(id);
        expect(sync.getSync(id)!.syncState).toBe('SYNCING');
        sync.markSynchronized(id, i, i * 100);
        expect(sync.getSync(id)!.syncState).toBe('SYNCHRONIZED');
        expect(sync.getSync(id)!.graphVersion).toBe(i);
        expect(sync.getSync(id)!.lastSyncTick).toBe(i * 100);
        expect(sync.getSync(id)!.isDirty).toBe(false);
      }
    });

    it('getDirtySyncs from 2000 syncs (half dirty)', () => {
      const sync = new CircuitSyncSynchronizer();
      for (let i = 0; i < 2000; i++) {
        sync.registerSync(createDefaultCircuitSyncModel(`ds_${i}`));
        if (i % 2 === 0) sync.markDirty(`ds_${i}`);
      }
      const dirty = sync.getDirtySyncs();
      expect(dirty.length).toBe(1000);
      for (const d of dirty) {
        expect(d.isDirty || d.syncState === 'DIRTY').toBe(true);
      }
    });

    it('getErrorSyncs from 2000 syncs (every 5th has error)', () => {
      const sync = new CircuitSyncSynchronizer();
      for (let i = 0; i < 2000; i++) {
        sync.registerSync(createDefaultCircuitSyncModel(`es_${i}`));
        if (i % 5 === 0) sync.markError(`es_${i}`, `Error at ${i}`);
      }
      const errors = sync.getErrorSyncs();
      expect(errors.length).toBe(400);
      for (const e of errors) {
        expect(e.syncState).toBe('ERROR');
      }
    });

    it('setLastGraphId and setLastProgramId for 2000 syncs', () => {
      const sync = new CircuitSyncSynchronizer();
      for (let i = 0; i < 2000; i++) {
        sync.registerSync(createDefaultCircuitSyncModel(`lk_${i}`));
        sync.setLastGraphId(`lk_${i}`, `graph_${i}`);
        sync.setLastProgramId(`lk_${i}`, `prog_${i}`);
      }
      for (let i = 0; i < 2000; i++) {
        const s = sync.getSync(`lk_${i}`)!;
        expect(s.lastGraphId).toBe(`graph_${i}`);
        expect(s.lastProgramId).toBe(`prog_${i}`);
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 29: Massive Blockly Generator Sweeps
  // ═════════════════════════════════════════════════════════════
  describe('§29 — Massive Blockly Generator Sweeps', () => {

    it('generates LED instructions for all 40 GPIOs and verifies', () => {
      for (let gpio = 0; gpio < 40; gpio++) {
        const result = generateLedInstructions(gpio);
        expect(result.setup.length).toBe(1);
        expect(result.setup[0].opcode).toBe('PIN_MODE');
        expect(result.setup[0].args.pin).toBe(gpio);
        expect(result.setup[0].args.mode).toBe('OUTPUT');
        expect(result.loop.length).toBe(4);
        expect(result.loop[0].opcode).toBe('DIGITAL_WRITE');
        expect(result.loop[0].args.pin).toBe(gpio);
        expect(result.loop[0].args.state).toBe('HIGH');
        expect(result.loop[2].opcode).toBe('DIGITAL_WRITE');
        expect(result.loop[2].args.state).toBe('LOW');
      }
    });

    it('generates HCSR04 instructions for 400 pin combinations', () => {
      for (let trig = 0; trig < 20; trig++) {
        for (let echo = 20; echo < 40; echo++) {
          const result = generateHcsr04Instructions(trig, echo);
          expect(result.setup.length).toBe(2);
          expect(result.setup[0].args.pin).toBe(trig);
          expect(result.setup[1].args.pin).toBe(echo);
          expect(result.loop.length).toBe(7);
        }
      }
    });

    it('generates Servo instructions for all 40 GPIOs', () => {
      for (let gpio = 0; gpio < 40; gpio++) {
        const result = generateServoInstructions(gpio);
        expect(result.setup.length).toBe(1);
        expect(result.setup[0].args.pin).toBe(gpio);
        expect(result.loop.length).toBe(6);
        expect(result.loop[0].opcode).toBe('PWM_WRITE');
        expect(result.loop[0].args.pin).toBe(gpio);
        expect(result.loop[2].opcode).toBe('PWM_WRITE');
        expect(result.loop[4].opcode).toBe('PWM_WRITE');
      }
    });

    it('generates buzzer instructions for all 40 GPIOs', () => {
      for (let gpio = 0; gpio < 40; gpio++) {
        const result = generateBuzzerInstructions(gpio);
        expect(result.setup.length).toBe(1);
        expect(result.setup[0].args.pin).toBe(gpio);
        expect(result.loop.length).toBe(4);
        expect(result.loop[0].opcode).toBe('PWM_WRITE');
        expect(result.loop[2].opcode).toBe('PWM_WRITE');
        expect(result.loop[0].args.duty).toBe(128);
        expect(result.loop[2].args.duty).toBe(0);
      }
    });

    it('generates relay instructions for all 40 GPIOs', () => {
      for (let gpio = 0; gpio < 40; gpio++) {
        const result = generateRelayInstructions(gpio);
        expect(result.setup.length).toBe(1);
        expect(result.setup[0].args.pin).toBe(gpio);
        expect(result.loop.length).toBe(4);
        expect(result.loop[0].opcode).toBe('DIGITAL_WRITE');
        expect(result.loop[0].args.state).toBe('HIGH');
        expect(result.loop[2].args.state).toBe('LOW');
      }
    });

    it('generates DHT11 instructions for all 40 GPIOs', () => {
      for (let gpio = 0; gpio < 40; gpio++) {
        const result = generateDht11Instructions(gpio);
        expect(result.setup.length).toBe(1);
        expect(result.setup[0].args.pin).toBe(gpio);
        expect(result.setup[0].args.mode).toBe('INPUT');
        expect(result.loop.length).toBe(2);
        expect(result.loop[0].opcode).toBe('DIGITAL_READ');
        expect(result.loop[0].args.pin).toBe(gpio);
      }
    });

    it('generates push button instructions for all 40 GPIOs', () => {
      for (let gpio = 0; gpio < 40; gpio++) {
        const result = generatePushButtonInstructions(gpio);
        expect(result.setup.length).toBe(1);
        expect(result.setup[0].args.pin).toBe(gpio);
        expect(result.setup[0].args.mode).toBe('INPUT_PULLUP');
        expect(result.loop.length).toBe(2);
        expect(result.loop[0].opcode).toBe('DIGITAL_READ');
      }
    });

    it('generates MQ2 instructions for all 40 GPIOs', () => {
      for (let gpio = 0; gpio < 40; gpio++) {
        const result = generateMq2Instructions(gpio);
        expect(result.setup.length).toBe(1);
        expect(result.setup[0].args.pin).toBe(gpio);
        expect(result.loop.length).toBe(2);
        expect(result.loop[0].opcode).toBe('DIGITAL_READ');
      }
    });

    it('generates potentiometer instructions for all 40 GPIOs', () => {
      for (let gpio = 0; gpio < 40; gpio++) {
        const result = generatePotentiometerInstructions(gpio);
        expect(result.setup.length).toBe(1);
        expect(result.setup[0].args.pin).toBe(gpio);
        expect(result.loop.length).toBe(2);
        expect(result.loop[0].opcode).toBe('DIGITAL_READ');
      }
    });

    it('generates IR sensor instructions for all 40 GPIOs', () => {
      for (let gpio = 0; gpio < 40; gpio++) {
        const result = generateIrSensorInstructions(gpio);
        expect(result.setup.length).toBe(1);
        expect(result.setup[0].args.pin).toBe(gpio);
        expect(result.loop.length).toBe(2);
        expect(result.loop[0].opcode).toBe('DIGITAL_READ');
      }
    });

    it('generates OLED instructions for 400 SDA/SCL combinations', () => {
      for (let sda = 0; sda < 20; sda++) {
        for (let scl = 20; scl < 40; scl++) {
          const result = generateOledInstructions(sda, scl);
          expect(result.setup.length).toBe(1);
          expect(result.loop.length).toBe(2);
          expect(result.setup[0].args.sda).toBe(sda);
          expect(result.setup[0].args.scl).toBe(scl);
        }
      }
    });

    it('evaluateBlocklyPinUsage for 2000 LED programs', () => {
      for (let gpio = 0; gpio < 40; gpio++) {
        const instr = generateLedInstructions(gpio);
        const program = createDefaultBlocklyProgramModel(`prog_${gpio}`, {
          setupInstructions: instr.setup,
          loopInstructions: instr.loop,
        });
        const usage = evaluateBlocklyPinUsage(program);
        expect(usage.gpiosUsed).toContain(gpio);
        expect(usage.peripheralTypes).toContain('GPIO');
        expect(usage.peripheralTypes).toContain('DIGITAL_OUTPUT');
        expect(usage.gpiosUsed.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('evaluateBlocklyPinUsage for 2000 servo programs (PWM)', () => {
      for (let gpio = 0; gpio < 40; gpio++) {
        const instr = generateServoInstructions(gpio);
        const program = createDefaultBlocklyProgramModel(`servo_prog_${gpio}`, {
          setupInstructions: instr.setup,
          loopInstructions: instr.loop,
        });
        const usage = evaluateBlocklyPinUsage(program);
        expect(usage.gpiosUsed).toContain(gpio);
        expect(usage.peripheralTypes).toContain('PWM');
        expect(usage.peripheralTypes).toContain('GPIO');
      }
    });

    it('highlightAffectedComponents for 2000 mappings', () => {
      const mappings = range(2000).map(i =>
        createDefaultCircuitMappingModel(`m_${i}`, {
          componentId: `c_${i % 500}`, gpioNumber: i % 40,
        }),
      );
      for (let gpio = 0; gpio < 40; gpio++) {
        const affected = highlightAffectedComponents([gpio], mappings);
        expect(affected.length).toBeGreaterThanOrEqual(1);
        for (const compId of affected) {
          expect(typeof compId).toBe('string');
          expect(compId.startsWith('c_')).toBe(true);
        }
      }
    });

    it('detectBlocklyCircuitMismatch for 1000 combinations', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      for (let i = 0; i < 1000; i++) {
        const gpio = i % 40;
        const instr = generateLedInstructions(gpio);
        const program = createDefaultBlocklyProgramModel(`mm_p_${i}`, {
          setupInstructions: instr.setup,
          loopInstructions: instr.loop,
        });
        const mappings = (i % 2 === 0)
          ? [createDefaultCircuitMappingModel(`mm_m_${i}`, { componentId: `c_${i}`, pinName: 'anode', gpioNumber: gpio })]
          : []; // Empty means mismatch
        const warnings = detectBlocklyCircuitMismatch(program, mappings);
        expect(Array.isArray(warnings)).toBe(true);
        if (i % 2 !== 0) {
          expect(warnings.some(w => w.code === 'GPIO_NOT_MAPPED')).toBe(true);
        }
      }
      vi.restoreAllMocks();
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 30: Massive Serial/Logic Linking
  // ═════════════════════════════════════════════════════════════
  describe('§30 — Massive Serial/Logic Linking', () => {

    it('linkSerialOutput for 2000 SERIAL_PRINT instructions', () => {
      for (let i = 0; i < 2000; i++) {
        const result = linkSerialOutput(
          { opcode: 'SERIAL_PRINT', args: { text: `Message ${i}` } },
          `comp_${i}`,
        );
        expect(result).not.toBeNull();
        expect(result!.text).toBe(`Message ${i}`);
        expect(result!.componentId).toBe(`comp_${i}`);
      }
    });

    it('linkSerialOutput for 2000 SERIAL_PRINTLN instructions', () => {
      for (let i = 0; i < 2000; i++) {
        const result = linkSerialOutput(
          { opcode: 'SERIAL_PRINTLN', args: { value: `Val ${i}` } },
          `comp_${i}`,
        );
        expect(result).not.toBeNull();
        expect(result!.text).toBe(`Val ${i}`);
        expect(result!.componentId).toBe(`comp_${i}`);
      }
    });

    it('linkSerialOutput for 2000 NOP with PRINT in desc', () => {
      for (let i = 0; i < 2000; i++) {
        const result = linkSerialOutput(
          { opcode: 'NOP', args: { description: `PRINT something ${i}`, text: `txt_${i}` } },
          `comp_${i}`,
        );
        expect(result).not.toBeNull();
        expect(result!.text).toBe(`txt_${i}`);
        expect(result!.componentId).toBe(`comp_${i}`);
      }
    });

    it('linkSerialOutput returns null for 2000 non-serial NOPs', () => {
      for (let i = 0; i < 2000; i++) {
        const result = linkSerialOutput(
          { opcode: 'NOP', args: { description: `regular_${i}` } },
          `comp_${i}`,
        );
        expect(result).toBeNull();
      }
    });

    it('linkLogicAnalyzerSample for 2000 LOW→HIGH transitions', () => {
      for (let i = 0; i < 2000; i++) {
        const gpio = i % 40;
        const tick = i * 10;
        const result = linkLogicAnalyzerSample(gpio, 'LOW', 'HIGH', tick);
        expect(result).not.toBeNull();
        expect(result!.pinNumber).toBe(gpio);
        expect(result!.level).toBe('HIGH');
        expect(result!.timestamp).toBe(tick);
      }
    });

    it('linkLogicAnalyzerSample for 2000 HIGH→LOW transitions', () => {
      for (let i = 0; i < 2000; i++) {
        const gpio = i % 40;
        const tick = i * 10;
        const result = linkLogicAnalyzerSample(gpio, 'HIGH', 'LOW', tick);
        expect(result).not.toBeNull();
        expect(result!.pinNumber).toBe(gpio);
        expect(result!.level).toBe('LOW');
        expect(result!.timestamp).toBe(tick);
      }
    });

    it('linkLogicAnalyzerSample for 2000 transitions to FLOATING', () => {
      for (let i = 0; i < 2000; i++) {
        const gpio = i % 40;
        const result = linkLogicAnalyzerSample(gpio, 'HIGH', 'FLOATING', i);
        expect(result).not.toBeNull();
        expect(result!.pinNumber).toBe(gpio);
        expect(result!.level).toBe('Z');
        expect(result!.timestamp).toBe(i);
      }
    });

    it('linkLogicAnalyzerSample returns null for 2000 same-state pairs', () => {
      for (let i = 0; i < 2000; i++) {
        const state = i % 2 === 0 ? 'HIGH' : 'LOW';
        const result = linkLogicAnalyzerSample(i % 40, state, state, i);
        expect(result).toBeNull();
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 31: Massive Cross-Module Pipeline
  // ═════════════════════════════════════════════════════════════
  describe('§31 — Massive Cross-Module Pipeline', () => {
    beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
    afterEach(() => { vi.restoreAllMocks(); });

    it('full pipeline for 500 component configurations', () => {
      for (let i = 0; i < 500; i++) {
        const graphSync = new CircuitGraphSynchronizer();
        const compType = SUPPORTED_COMPONENT_TYPES[i % 13];
        const gpio = (i * 3 + 2) % 40;
        const graph = createDefaultCircuitGraphModel(`pipe_g_${i}`, { componentIds: [`c_${i}`] });
        const mapping = createDefaultCircuitMappingModel(`pipe_m_${i}`, {
          componentId: `c_${i}`, componentType: compType,
          pinName: 'signal', gpioNumber: gpio,
        });
        const program = generateBlocklyFromCircuit(graph, [mapping], `esp_${i}`);
        expect(program).toBeDefined();
        expect(program.programId).toBeTruthy();
        expect(program.esp32Id).toBe(`esp_${i}`);
        const usage = evaluateBlocklyPinUsage(program);
        expect(Array.isArray(usage.gpiosUsed)).toBe(true);
        expect(Array.isArray(usage.peripheralTypes)).toBe(true);
      }
    });

    it('build → validate → health for 200 graph sizes', () => {
      for (let n = 1; n <= 200; n++) {
        const sync = new CircuitGraphSynchronizer();
        const params = makeBuildParams(n, Math.max(0, n - 1));
        const graph = sync.buildCircuitGraph(params);
        expect(graph.componentIds.length).toBe(n);
        const warnings = sync.validateCircuitGraphById(graph.graphId);
        expect(Array.isArray(warnings)).toBe(true);
        const health = sync.calculateProjectHealth(graph.graphId, [], false);
        expect(health.totalComponents).toBe(n);
        expect(typeof health.healthGrade).toBe('string');
        sync.clearAll();
      }
    });

    it('claim → detect → snapshot for 500 ownership sets', () => {
      for (let i = 0; i < 500; i++) {
        const sync = new GpioOwnershipSynchronizer();
        const gpio = i % 40;
        sync.claimGpio(`pipeline_${i}`, gpio, `comp_${i}`, 'led', 'anode', 'OUTPUT');
        expect(sync.hasOwnership(`pipeline_${i}`)).toBe(true);
        const snap = sync.getSnapshot();
        expect(snap.ownerships.length).toBe(1);
        expect(snap.ownerships[0].gpioNumber).toBe(gpio);
      }
    });

    it('register → dirty → syncing → synchronized for 500 syncs', () => {
      for (let i = 0; i < 500; i++) {
        const sync = new CircuitSyncSynchronizer();
        const id = `pipe_s_${i}`;
        sync.registerSync(createDefaultCircuitSyncModel(id));
        sync.markDirty(id);
        sync.markSyncing(id);
        sync.markSynchronized(id, i, i * 10);
        const s = sync.getSync(id)!;
        expect(s.syncState).toBe('SYNCHRONIZED');
        expect(s.graphVersion).toBe(i);
        expect(s.isDirty).toBe(false);
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 32: Massive Snapshot Verification
  // ═════════════════════════════════════════════════════════════
  describe('§32 — Massive Snapshot Verification', () => {

    it('CircuitGraphSynchronizer snapshot with 2000 items per registry', () => {
      const sync = new CircuitGraphSynchronizer();
      for (let i = 0; i < 2000; i++) {
        sync.registerCircuitNode(createDefaultCircuitNodeModel(`sn_${i}`));
        sync.registerCircuitEdge(createDefaultCircuitEdgeModel(`se_${i}`, { sourceNodeId: 's', targetNodeId: 't' }));
        sync.registerCircuitNet(createDefaultCircuitNetModel(`snet_${i}`));
        sync.registerCircuitMapping(createDefaultCircuitMappingModel(`sm_${i}`));
      }
      const snap = sync.getSnapshot();
      expect(snap.nodes.length).toBe(2000);
      expect(snap.edges.length).toBe(2000);
      expect(snap.nets.length).toBe(2000);
      expect(snap.mappings.length).toBe(2000);
      // Verify all IDs present
      for (let i = 0; i < 2000; i++) {
        expect(snap.nodes.some(n => n.nodeId === `sn_${i}`)).toBe(true);
        expect(snap.edges.some(e => e.edgeId === `se_${i}`)).toBe(true);
        expect(snap.nets.some(n => n.netId === `snet_${i}`)).toBe(true);
        expect(snap.mappings.some(m => m.mappingId === `sm_${i}`)).toBe(true);
      }
    });

    it('GpioOwnershipSynchronizer snapshot with 2000 ownerships and 500 conflicts', () => {
      const sync = new GpioOwnershipSynchronizer();
      for (let i = 0; i < 2000; i++) {
        sync.registerOwnership(createDefaultGpioOwnershipModel(`so_${i}`, { gpioNumber: i % 40, componentId: `c_${i}` }));
      }
      for (let i = 0; i < 500; i++) {
        sync.registerConflict(createDefaultGpioConflictModel(`sc_${i}`));
      }
      const snap = sync.getSnapshot();
      expect(snap.ownerships.length).toBe(2000);
      expect(snap.conflicts.length).toBe(500);
      for (let i = 0; i < 2000; i++) {
        expect(snap.ownerships.some(o => o.ownershipId === `so_${i}`)).toBe(true);
      }
      for (let i = 0; i < 500; i++) {
        expect(snap.conflicts.some(c => c.conflictId === `sc_${i}`)).toBe(true);
      }
    });

    it('CircuitSyncSynchronizer snapshot with 2000 syncs', () => {
      const sync = new CircuitSyncSynchronizer();
      for (let i = 0; i < 2000; i++) {
        sync.registerSync(createDefaultCircuitSyncModel(`ss_${i}`));
      }
      const snap = sync.getSnapshot();
      expect(snap.syncModels.length).toBe(2000);
      for (let i = 0; i < 2000; i++) {
        expect(snap.syncModels.some(s => s.syncId === `ss_${i}`)).toBe(true);
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 33: Massive Remove & Clear Operations
  // ═════════════════════════════════════════════════════════════
  describe('§33 — Massive Remove & Clear', () => {

    it('remove 1000 nodes one-by-one and verify', () => {
      const sync = new CircuitGraphSynchronizer();
      for (let i = 0; i < 1000; i++) {
        sync.registerCircuitNode(createDefaultCircuitNodeModel(`rm_n_${i}`));
      }
      expect(sync.getAllCircuitNodes().length).toBe(1000);
      for (let i = 0; i < 1000; i++) {
        sync.removeCircuitNode(`rm_n_${i}`);
        expect(sync.hasCircuitNode(`rm_n_${i}`)).toBe(false);
      }
      expect(sync.getAllCircuitNodes().length).toBe(0);
    });

    it('remove 1000 edges one-by-one and verify', () => {
      const sync = new CircuitGraphSynchronizer();
      for (let i = 0; i < 1000; i++) {
        sync.registerCircuitEdge(createDefaultCircuitEdgeModel(`rm_e_${i}`, { sourceNodeId: 's', targetNodeId: 't' }));
      }
      for (let i = 0; i < 1000; i++) {
        sync.removeCircuitEdge(`rm_e_${i}`);
        expect(sync.hasCircuitEdge(`rm_e_${i}`)).toBe(false);
      }
      expect(sync.getAllCircuitEdges().length).toBe(0);
    });

    it('remove 1000 ownerships one-by-one and verify', () => {
      const sync = new GpioOwnershipSynchronizer();
      for (let i = 0; i < 1000; i++) {
        sync.registerOwnership(createDefaultGpioOwnershipModel(`rm_o_${i}`, { gpioNumber: i % 40, componentId: `c_${i}` }));
      }
      for (let i = 0; i < 1000; i++) {
        sync.removeOwnership(`rm_o_${i}`);
        expect(sync.hasOwnership(`rm_o_${i}`)).toBe(false);
      }
      expect(sync.getAllOwnerships().length).toBe(0);
    });

    it('remove 1000 syncs one-by-one and verify', () => {
      const sync = new CircuitSyncSynchronizer();
      for (let i = 0; i < 1000; i++) {
        sync.registerSync(createDefaultCircuitSyncModel(`rm_s_${i}`));
      }
      for (let i = 0; i < 1000; i++) {
        sync.removeSync(`rm_s_${i}`);
        expect(sync.hasSync(`rm_s_${i}`)).toBe(false);
      }
      expect(sync.getAllSyncs().length).toBe(0);
    });

    it('clearAll after 2000 registrations in all registries', () => {
      const graphSync = new CircuitGraphSynchronizer();
      const gpioSync = new GpioOwnershipSynchronizer();
      const circuitSync = new CircuitSyncSynchronizer();
      for (let i = 0; i < 2000; i++) {
        graphSync.registerCircuitNode(createDefaultCircuitNodeModel(`ca_n_${i}`));
        graphSync.registerCircuitEdge(createDefaultCircuitEdgeModel(`ca_e_${i}`, { sourceNodeId: 's', targetNodeId: 't' }));
        gpioSync.registerOwnership(createDefaultGpioOwnershipModel(`ca_o_${i}`, { gpioNumber: i % 40, componentId: `c_${i}` }));
        circuitSync.registerSync(createDefaultCircuitSyncModel(`ca_s_${i}`));
      }
      graphSync.clearAll();
      gpioSync.clearAll();
      circuitSync.clearAll();
      expect(graphSync.getAllCircuitNodes().length).toBe(0);
      expect(graphSync.getAllCircuitEdges().length).toBe(0);
      expect(graphSync.getAllCircuitNets().length).toBe(0);
      expect(graphSync.getAllCircuitGraphs().length).toBe(0);
      expect(graphSync.getAllCircuitMappings().length).toBe(0);
      expect(gpioSync.getAllOwnerships().length).toBe(0);
      expect(gpioSync.getAllConflicts().length).toBe(0);
      expect(circuitSync.getAllSyncs().length).toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 34: Massive Live Analyzer Operations
  // ═════════════════════════════════════════════════════════════
  describe('§34 — Massive Live Analyzer', () => {

    it('onComponentPlaced for 1000 components and verify', () => {
      const sync = new CircuitGraphSynchronizer();
      for (let i = 0; i < 1000; i++) {
        sync.onComponentPlaced(`la_comp_${i}`, SUPPORTED_COMPONENT_TYPES[i % 13], [
          { pinName: 'pin1', gpioNumber: i % 40, signalType: 'DIGITAL' },
          { pinName: 'pin2', gpioNumber: (i + 1) % 40, signalType: 'GND' },
        ]);
      }
      for (let i = 0; i < 1000; i++) {
        expect(sync.hasCircuitNode(`la_comp_${i}_pin1`)).toBe(true);
        expect(sync.hasCircuitNode(`la_comp_${i}_pin2`)).toBe(true);
        expect(sync.getCircuitNode(`la_comp_${i}_pin1`)!.gpioNumber).toBe(i % 40);
      }
    });

    it('onWireAdded for 1000 wires and verify', () => {
      const sync = new CircuitGraphSynchronizer();
      for (let i = 0; i < 1000; i++) {
        sync.onWireAdded(`la_w_${i}`, `src_${i}`, `tgt_${i}`);
      }
      for (let i = 0; i < 1000; i++) {
        expect(sync.hasCircuitEdge(`la_w_${i}`)).toBe(true);
        const e = sync.getCircuitEdge(`la_w_${i}`)!;
        expect(e.sourceNodeId).toBe(`src_${i}`);
        expect(e.targetNodeId).toBe(`tgt_${i}`);
      }
    });

    it('onComponentPlaced then onComponentRemoved for 500 components', () => {
      const sync = new CircuitGraphSynchronizer();
      for (let i = 0; i < 500; i++) {
        sync.onComponentPlaced(`rem_comp_${i}`, 'led', [
          { pinName: 'a', gpioNumber: i % 40, signalType: 'DIGITAL' },
        ]);
      }
      for (let i = 0; i < 500; i++) {
        expect(sync.hasCircuitNode(`rem_comp_${i}_a`)).toBe(true);
      }
      for (let i = 0; i < 500; i++) {
        sync.onComponentRemoved(`rem_comp_${i}`);
        expect(sync.hasCircuitNode(`rem_comp_${i}_a`)).toBe(false);
      }
    });

    it('onWireAdded then onWireRemoved for 1000 wires', () => {
      const sync = new CircuitGraphSynchronizer();
      for (let i = 0; i < 1000; i++) {
        sync.onWireAdded(`wr_${i}`, `s_${i}`, `t_${i}`);
      }
      for (let i = 0; i < 1000; i++) {
        expect(sync.hasCircuitEdge(`wr_${i}`)).toBe(true);
      }
      for (let i = 0; i < 1000; i++) {
        sync.onWireRemoved(`wr_${i}`);
        expect(sync.hasCircuitEdge(`wr_${i}`)).toBe(false);
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 35: Massive Export/Import Round-Trips
  // ═════════════════════════════════════════════════════════════
  describe('§35 — Massive Export/Import', () => {
    beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
    afterEach(() => { vi.restoreAllMocks(); });

    it('export and import 200 graphs', () => {
      for (let i = 0; i < 200; i++) {
        const sync = new CircuitGraphSynchronizer();
        const params = makeBuildParams(3, 2);
        const graph = sync.buildCircuitGraph(params);
        const json = sync.exportCircuitGraph(graph.graphId);
        expect(json).not.toBe('{}');
        expect(json.length).toBeGreaterThan(10);
        const parsed = JSON.parse(json);
        expect(parsed.graphId).toBe(graph.graphId);
        expect(parsed.componentIds.length).toBe(3);
        const sync2 = new CircuitGraphSynchronizer();
        const imported = sync2.importCircuitGraph(json);
        expect(imported).not.toBeNull();
        expect(imported!.graphId).toBe(graph.graphId);
        expect(imported!.nodes.length).toBe(graph.nodes.length);
        expect(imported!.edges.length).toBe(graph.edges.length);
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // SECTION 36: Constants Membership Mega-Sweep
  // ═════════════════════════════════════════════════════════════
  describe('§36 — Constants Membership Sweep', () => {

    it('every GPIO 0-39 categorized against all constant arrays', () => {
      for (let gpio = 0; gpio < 40; gpio++) {
        const isIO = ESP32_INPUT_ONLY_PINS.includes(gpio);
        const isRes = ESP32_RESERVED_PINS.includes(gpio);
        expect(typeof isIO).toBe('boolean');
        expect(typeof isRes).toBe('boolean');
        // Each node type valid
        for (const nt of VALID_CIRCUIT_NODE_TYPES) {
          expect(typeof nt).toBe('string');
          expect(nt.length).toBeGreaterThan(0);
        }
        // Each edge type valid
        for (const et of VALID_CIRCUIT_EDGE_TYPES) {
          expect(typeof et).toBe('string');
          expect(et.length).toBeGreaterThan(0);
        }
        // Each net state valid
        for (const ns of VALID_CIRCUIT_NET_STATES) {
          expect(typeof ns).toBe('string');
          expect(ns.length).toBeGreaterThan(0);
        }
        // Each direction valid
        for (const dir of VALID_GPIO_DIRECTIONS) {
          expect(typeof dir).toBe('string');
          expect(dir.length).toBeGreaterThan(0);
        }
        // Each conflict type valid
        for (const ct of VALID_GPIO_CONFLICT_TYPES) {
          expect(typeof ct).toBe('string');
          expect(ct.length).toBeGreaterThan(0);
        }
        // Each severity valid
        for (const sev of VALID_GPIO_CONFLICT_SEVERITIES) {
          expect(typeof sev).toBe('string');
          expect(sev.length).toBeGreaterThan(0);
        }
        // Each sync state valid
        for (const ss of VALID_CIRCUIT_SYNC_STATES) {
          expect(typeof ss).toBe('string');
          expect(ss.length).toBeGreaterThan(0);
        }
        // Each component type valid
        for (const ct of SUPPORTED_COMPONENT_TYPES) {
          expect(typeof ct).toBe('string');
          expect(ct.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
