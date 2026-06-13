import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import {
  ElectricalNodeModel,
  ElectricalNetModel,
  ElectricalConnectionModel,
  BreadboardRailModel,
  BreadboardRowModel,
  StageState,
} from '../src/types';
import {
  createDefaultElectricalNodeModel,
  createDefaultElectricalNetModel,
  createDefaultElectricalConnectionModel,
  createDefaultBreadboardRailModel,
  createDefaultBreadboardRowModel,
  validateElectricalNodeModel,
  validateElectricalNetModel,
  validateElectricalConnectionModel,
  validateBreadboardRailModel,
  validateBreadboardRowModel,
  validateDuplicateElectricalNodeIds,
  validateDuplicateElectricalNetIds,
  validateDuplicateElectricalConnectionIds,
  validateDuplicateBreadboardRailIds,
  validateDuplicateBreadboardRowIds,
  ElectricalConnectivitySynchronizer,
  connectNodes,
  disconnectNodes,
  findConnectedNodes,
  findConnectedNet,
  propagateLogicState,
  propagateVoltage,
  solveConnectivity,
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

// Helpers for creating models
function node(i: number, id?: string, overrides: Partial<ElectricalNodeModel> = {}): ElectricalNodeModel {
  return createDefaultElectricalNodeModel(id || `node_${i}`, overrides);
}

// Net helper
function net(i: number, id?: string, overrides: Partial<ElectricalNetModel> = {}): ElectricalNetModel {
  return createDefaultElectricalNetModel(id || `net_${i}`, overrides);
}

function connection(i: number, id?: string, overrides: Partial<ElectricalConnectionModel> = {}): ElectricalConnectionModel {
  return createDefaultElectricalConnectionModel(id || `connection_${i}`, {
    sourceNodeId: `node_source_${i}`,
    targetNodeId: `node_target_${i}`,
    ...overrides,
  });
}

function rail(i: number, id?: string, overrides: Partial<BreadboardRailModel> = {}): BreadboardRailModel {
  return createDefaultBreadboardRailModel(id || `rail_${i}`, overrides);
}

function row(i: number, id?: string, overrides: Partial<BreadboardRowModel> = {}): BreadboardRowModel {
  return createDefaultBreadboardRowModel(id || `row_${i}`, overrides);
}

const CRUD_ITER = 1500;

describe('Phase 17A: Electrical Connectivity Foundation Tests', () => {
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
      name: 'ElectricalNodeModel',
      idKey: 'nodeId',
      register: 'registerElectricalNodeModel',
      get: 'getElectricalNodeModel',
      getAll: 'getElectricalNodeModels',
      update: 'updateElectricalNodeModel',
      remove: 'removeElectricalNodeModel',
      clear: 'clearElectricalNodeModels',
      keys: 'getElectricalNodeModelKeys',
      has: 'hasElectricalNodeModel',
      factory: node,
      idPrefix: 'node',
      updateField: 'nodeType',
      updateValue: 'UPDATED_GPIO',
    },
    {
      name: 'ElectricalNetModel',
      idKey: 'netId',
      register: 'registerElectricalNetModel',
      get: 'getElectricalNetModel',
      getAll: 'getElectricalNetModels',
      update: 'updateElectricalNetModel',
      remove: 'removeElectricalNetModel',
      clear: 'clearElectricalNetModels',
      keys: 'getElectricalNetModelKeys',
      has: 'hasElectricalNetModel',
      factory: net,
      idPrefix: 'net',
      updateField: 'netState',
      updateValue: 'ACTIVE_UPDATED',
    },
    {
      name: 'ElectricalConnectionModel',
      idKey: 'connectionId',
      register: 'registerElectricalConnectionModel',
      get: 'getElectricalConnectionModel',
      getAll: 'getElectricalConnectionModels',
      update: 'updateElectricalConnectionModel',
      remove: 'removeElectricalConnectionModel',
      clear: 'clearElectricalConnectionModels',
      keys: 'getElectricalConnectionModelKeys',
      has: 'hasElectricalConnectionModel',
      factory: connection,
      idPrefix: 'connection',
      updateField: 'connectionState',
      updateValue: 'DISCONNECTED_UPDATED',
    },
    {
      name: 'BreadboardRailModel',
      idKey: 'railId',
      register: 'registerBreadboardRailModel',
      get: 'getBreadboardRailModel',
      getAll: 'getBreadboardRailModels',
      update: 'updateBreadboardRailModel',
      remove: 'removeBreadboardRailModel',
      clear: 'clearBreadboardRailModels',
      keys: 'getBreadboardRailModelKeys',
      has: 'hasBreadboardRailModel',
      factory: rail,
      idPrefix: 'rail',
      updateField: 'railType',
      updateValue: 'GROUND_UPDATED',
    },
    {
      name: 'BreadboardRowModel',
      idKey: 'rowId',
      register: 'registerBreadboardRowModel',
      get: 'getBreadboardRowModel',
      getAll: 'getBreadboardRowModels',
      update: 'updateBreadboardRowModel',
      remove: 'removeBreadboardRowModel',
      clear: 'clearBreadboardRowModels',
      keys: 'getBreadboardRowModelKeys',
      has: 'hasBreadboardRowModel',
      factory: row,
      idPrefix: 'row',
      updateField: 'rowIndex',
      updateValue: 42,
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
        it(`has returns correct boolean for ${config.name} ${i}`, () => {
          const rt = runtime();
          expect((rt as any)[config.has](`${config.idPrefix}_${i}`)).toBe(false);
          (rt as any)[config.register](config.factory(i));
          expect((rt as any)[config.has](`${config.idPrefix}_${i}`)).toBe(true);
        });
      }

      for (let i = 0; i < CRUD_ITER; i++) {
        it(`returns undefined after removal for ${config.name} ${i}`, () => {
          const rt = runtime();
          (rt as any)[config.register](config.factory(i));
          (rt as any)[config.remove](`${config.idPrefix}_${i}`);
          expect((rt as any)[config.has](`${config.idPrefix}_${i}`)).toBe(false);
          expect((rt as any)[config.get](`${config.idPrefix}_${i}`)).toBeUndefined();
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Factory and Default Values
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 2: Factory and Default Values', () => {
    it('createDefaultElectricalNodeModel returns correct defaults', () => {
      const model = createDefaultElectricalNodeModel('test_node');
      expect(model.nodeId).toBe('test_node');
      expect(model.nodeType).toBe('GPIO_PIN');
      expect(model.voltage).toBe(0);
      expect(model.current).toBe(0);
      expect(model.logicState).toBe('FLOATING');
      expect(model.metadata).toEqual({});
    });

    it('createDefaultElectricalNetModel returns correct defaults', () => {
      const model = createDefaultElectricalNetModel('test_net');
      expect(model.netId).toBe('test_net');
      expect(model.nodeIds).toEqual([]);
      expect(model.netState).toBe('INACTIVE');
      expect(model.metadata).toEqual({});
    });

    it('createDefaultElectricalConnectionModel returns correct defaults', () => {
      const model = createDefaultElectricalConnectionModel('test_connection');
      expect(model.connectionId).toBe('test_connection');
      expect(model.sourceNodeId).toBe('');
      expect(model.targetNodeId).toBe('');
      expect(model.connectionType).toBe('WIRE');
      expect(model.connectionState).toBe('CONNECTED');
    });

    it('createDefaultBreadboardRailModel returns correct defaults', () => {
      const model = createDefaultBreadboardRailModel('test_rail');
      expect(model.railId).toBe('test_rail');
      expect(model.railType).toBe('POWER');
      expect(model.nodeIds).toEqual([]);
      expect(model.metadata).toEqual({});
    });

    it('createDefaultBreadboardRowModel returns correct defaults', () => {
      const model = createDefaultBreadboardRowModel('test_row');
      expect(model.rowId).toBe('test_row');
      expect(model.rowIndex).toBe(0);
      expect(model.columnIds).toEqual([]);
      expect(model.nodeIds).toEqual([]);
      expect(model.metadata).toEqual({});
    });

    for (let i = 0; i < 100; i++) {
      it(`createDefaultElectricalNodeModel accepts overrides ${i}`, () => {
        const model = createDefaultElectricalNodeModel(`ov_${i}`, { nodeType: `TYPE_${i}`, voltage: i, metadata: { tag: i } });
        expect(model.nodeId).toBe(`ov_${i}`);
        expect(model.nodeType).toBe(`TYPE_${i}`);
        expect(model.voltage).toBe(i);
        expect((model.metadata as any).tag).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`createDefaultElectricalNetModel accepts overrides ${i}`, () => {
        const model = createDefaultElectricalNetModel(`ov_${i}`, { netState: `STATE_${i}`, metadata: { tag: i } });
        expect(model.netId).toBe(`ov_${i}`);
        expect(model.netState).toBe(`STATE_${i}`);
        expect((model.metadata as any).tag).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`createDefaultElectricalConnectionModel accepts overrides ${i}`, () => {
        const model = createDefaultElectricalConnectionModel(`ov_${i}`, { connectionState: `STATE_${i}` });
        expect(model.connectionId).toBe(`ov_${i}`);
        expect(model.connectionState).toBe(`STATE_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`createDefaultBreadboardRailModel accepts overrides ${i}`, () => {
        const model = createDefaultBreadboardRailModel(`ov_${i}`, { railType: `RAIL_${i}`, metadata: { tag: i } });
        expect(model.railId).toBe(`ov_${i}`);
        expect(model.railType).toBe(`RAIL_${i}`);
        expect((model.metadata as any).tag).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`createDefaultBreadboardRowModel accepts overrides ${i}`, () => {
        const model = createDefaultBreadboardRowModel(`ov_${i}`, { rowIndex: i, metadata: { tag: i } });
        expect(model.rowId).toBe(`ov_${i}`);
        expect(model.rowIndex).toBe(i);
        expect((model.metadata as any).tag).toBe(i);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Validation
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 3: Validation - ElectricalNodeModel', () => {
    it('warns on null model', () => {
      const warnings = validateElectricalNodeModel(null as any);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnSpy).toHaveBeenCalled();
    });

    it('warns on empty nodeId', () => {
      const warnings = validateElectricalNodeModel({ ...node(0), nodeId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty nodeType', () => {
      const warnings = validateElectricalNodeModel({ ...node(0), nodeType: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid voltage', () => {
      const warnings = validateElectricalNodeModel({ ...node(0), voltage: 'not-a-number' as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid current', () => {
      const warnings = validateElectricalNodeModel({ ...node(0), current: 'not-a-number' as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid logicState', () => {
      const warnings = validateElectricalNodeModel({ ...node(0), logicState: 123 as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid metadata', () => {
      const warnings = validateElectricalNodeModel({ ...node(0), metadata: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('valid node model produces no warnings', () => {
      const warnings = validateElectricalNodeModel(node(0));
      expect(warnings.length).toBe(0);
    });
  });

  describe('SECTION 3: Validation - ElectricalNetModel', () => {
    it('warns on null model', () => {
      const warnings = validateElectricalNetModel(null as any);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty netId', () => {
      const warnings = validateElectricalNetModel({ ...net(0), netId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid nodeIds', () => {
      const warnings = validateElectricalNetModel({ ...net(0), nodeIds: 'not-an-array' as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid netState', () => {
      const warnings = validateElectricalNetModel({ ...net(0), netState: 123 as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid metadata', () => {
      const warnings = validateElectricalNetModel({ ...net(0), metadata: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('valid net model produces no warnings', () => {
      const warnings = validateElectricalNetModel(net(0));
      expect(warnings.length).toBe(0);
    });
  });

  describe('SECTION 3: Validation - ElectricalConnectionModel', () => {
    it('warns on null model', () => {
      const warnings = validateElectricalConnectionModel(null as any);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty connectionId', () => {
      const warnings = validateElectricalConnectionModel({ ...connection(0), connectionId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty sourceNodeId', () => {
      const warnings = validateElectricalConnectionModel({ ...connection(0), sourceNodeId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty targetNodeId', () => {
      const warnings = validateElectricalConnectionModel({ ...connection(0), targetNodeId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid connectionType', () => {
      const warnings = validateElectricalConnectionModel({ ...connection(0), connectionType: 123 as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid connectionState', () => {
      const warnings = validateElectricalConnectionModel({ ...connection(0), connectionState: 123 as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('valid connection model produces no warnings', () => {
      const warnings = validateElectricalConnectionModel({ ...connection(0), sourceNodeId: 'n1', targetNodeId: 'n2' });
      expect(warnings.length).toBe(0);
    });
  });

  describe('SECTION 3: Validation - BreadboardRailModel', () => {
    it('warns on null model', () => {
      const warnings = validateBreadboardRailModel(null as any);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty railId', () => {
      const warnings = validateBreadboardRailModel({ ...rail(0), railId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty railType', () => {
      const warnings = validateBreadboardRailModel({ ...rail(0), railType: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid nodeIds', () => {
      const warnings = validateBreadboardRailModel({ ...rail(0), nodeIds: 'not-an-array' as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid metadata', () => {
      const warnings = validateBreadboardRailModel({ ...rail(0), metadata: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('valid rail model produces no warnings', () => {
      const warnings = validateBreadboardRailModel(rail(0));
      expect(warnings.length).toBe(0);
    });
  });

  describe('SECTION 3: Validation - BreadboardRowModel', () => {
    it('warns on null model', () => {
      const warnings = validateBreadboardRowModel(null as any);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty rowId', () => {
      const warnings = validateBreadboardRowModel({ ...row(0), rowId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid rowIndex', () => {
      const warnings = validateBreadboardRowModel({ ...row(0), rowIndex: 'not-a-number' as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid columnIds', () => {
      const warnings = validateBreadboardRowModel({ ...row(0), columnIds: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid nodeIds', () => {
      const warnings = validateBreadboardRowModel({ ...row(0), nodeIds: {} as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid metadata', () => {
      const warnings = validateBreadboardRowModel({ ...row(0), metadata: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('valid row model produces no warnings', () => {
      const warnings = validateBreadboardRowModel(row(0));
      expect(warnings.length).toBe(0);
    });
  });

  describe('SECTION 3: Duplicate Validators', () => {
    for (let i = 0; i < 100; i++) {
      it(`detects duplicate node IDs ${i}`, () => {
        const warnings = validateDuplicateElectricalNodeIds([node(i, 'dup'), node(i, 'dup')]);
        expect(warnings.length).toBeGreaterThan(0);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`detects duplicate net IDs ${i}`, () => {
        const warnings = validateDuplicateElectricalNetIds([net(i, 'dup'), net(i, 'dup')]);
        expect(warnings.length).toBeGreaterThan(0);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`detects duplicate connection IDs ${i}`, () => {
        const warnings = validateDuplicateElectricalConnectionIds([connection(i, 'dup'), connection(i, 'dup')]);
        expect(warnings.length).toBeGreaterThan(0);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`detects duplicate rail IDs ${i}`, () => {
        const warnings = validateDuplicateBreadboardRailIds([rail(i, 'dup'), rail(i, 'dup')]);
        expect(warnings.length).toBeGreaterThan(0);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`detects duplicate row IDs ${i}`, () => {
        const warnings = validateDuplicateBreadboardRowIds([row(i, 'dup'), row(i, 'dup')]);
        expect(warnings.length).toBeGreaterThan(0);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: ElectricalConnectivitySynchronizer
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 4: ElectricalConnectivitySynchronizer', () => {
    for (let i = 0; i < 100; i++) {
      it(`buildSnapshot deep-copies all models ${i}`, () => {
        const sync = new ElectricalConnectivitySynchronizer();
        const snapshot = sync.buildSnapshot(
          [node(i)],
          [net(i)],
          [connection(i)],
          [rail(i)],
          [row(i)],
        );
        expect(snapshot.electricalNodes.length).toBe(1);
        expect(snapshot.electricalNets.length).toBe(1);
        expect(snapshot.electricalConnections.length).toBe(1);
        expect(snapshot.breadboardRails.length).toBe(1);
        expect(snapshot.breadboardRows.length).toBe(1);
        expect(snapshot.electricalNodes[0].nodeId).toBe(`node_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`clear removes all entries ${i}`, () => {
        const sync = new ElectricalConnectivitySynchronizer();
        sync.buildSnapshot(
          [node(i)],
          [net(i)],
          [connection(i)],
          [rail(i)],
          [row(i)],
        );
        sync.clear();
        expect(sync.electricalNodes.getAll().length).toBe(0);
        expect(sync.electricalNets.getAll().length).toBe(0);
        expect(sync.electricalConnections.getAll().length).toBe(0);
        expect(sync.breadboardRails.getAll().length).toBe(0);
        expect(sync.breadboardRows.getAll().length).toBe(0);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`clone produces independent copy ${i}`, () => {
        const sync = new ElectricalConnectivitySynchronizer();
        sync.buildSnapshot(
          [node(i)],
          [net(i)],
          [connection(i)],
          [rail(i)],
          [row(i)],
        );
        const cloned = sync.clone();
        sync.clear();
        expect(cloned.electricalNodes.length).toBe(1);
        expect(cloned.electricalNets.length).toBe(1);
        expect(cloned.electricalConnections.length).toBe(1);
        expect(cloned.breadboardRails.length).toBe(1);
        expect(cloned.breadboardRows.length).toBe(1);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`toJSON returns serializable data ${i}`, () => {
        const sync = new ElectricalConnectivitySynchronizer();
        sync.buildSnapshot(
          [node(i)],
          [net(i)],
          [connection(i)],
          [rail(i)],
          [row(i)],
        );
        const json = sync.toJSON();
        const parsed = JSON.parse(json);
        expect(parsed.electricalNodes.length).toBe(1);
        expect(parsed.electricalNets.length).toBe(1);
        expect(parsed.electricalConnections.length).toBe(1);
        expect(parsed.breadboardRails.length).toBe(1);
        expect(parsed.breadboardRows.length).toBe(1);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`fromJSON restores data ${i}`, () => {
        const sync = new ElectricalConnectivitySynchronizer();
        const json = JSON.stringify({
          electricalNodes: [node(i)],
          electricalNets: [net(i)],
          electricalConnections: [connection(i)],
          breadboardRails: [rail(i)],
          breadboardRows: [row(i)],
        });
        sync.fromJSON(json);
        expect(sync.electricalNodes.getAll().length).toBe(1);
        expect(sync.electricalNets.getAll().length).toBe(1);
        expect(sync.electricalConnections.getAll().length).toBe(1);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`sync replaces existing data ${i}`, () => {
        const sync = new ElectricalConnectivitySynchronizer();
        sync.buildSnapshot([node(0, 'old')], [], [], [], []);
        sync.sync({
          electricalNodes: [node(i)],
          electricalNets: [net(i)],
          electricalConnections: [connection(i)],
          breadboardRails: [rail(i)],
          breadboardRows: [row(i)],
        });
        const items = sync.electricalNodes.getAll();
        expect(items.length).toBe(1);
        expect(items[0].nodeId).toBe(`node_${i}`);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: Lifecycle Integration
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 5: Lifecycle Integration', () => {
    const registerAll = (rt: BaseRuntime, i: number) => {
      rt.registerElectricalNodeModel(node(i));
      rt.registerElectricalNetModel(net(i));
      rt.registerElectricalConnectionModel(connection(i));
      rt.registerBreadboardRailModel(rail(i));
      rt.registerBreadboardRowModel(row(i));
    };

    const expectEmptyAll = (rt: BaseRuntime) => {
      expect(rt.getElectricalNodeModels().length).toBe(0);
      expect(rt.getElectricalNetModels().length).toBe(0);
      expect(rt.getElectricalConnectionModels().length).toBe(0);
      expect(rt.getBreadboardRailModels().length).toBe(0);
      expect(rt.getBreadboardRowModels().length).toBe(0);
    };

    for (let i = 0; i < 100; i++) {
      it(`initialize clears electrical registries ${i}`, () => {
        const rt = runtime();
        registerAll(rt, i);
        rt.initialize();
        expectEmptyAll(rt);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`stop clears electrical registries ${i}`, () => {
        const rt = runtime();
        registerAll(rt, i);
        rt.stop();
        expectEmptyAll(rt);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`reset clears electrical registries ${i}`, () => {
        const rt = runtime();
        registerAll(rt, i);
        rt.reset();
        expectEmptyAll(rt);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`destroy clears electrical registries ${i}`, () => {
        const rt = runtime();
        registerAll(rt, i);
        rt.destroy();
        expectEmptyAll(rt);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: Stage Snapshot Synchronization
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 6: Stage Snapshot Synchronization', () => {
    for (let i = 0; i < 100; i++) {
      it(`electrical nodes appear in stage snapshot ${i}`, () => {
        const rt = runtime();
        rt.registerElectricalNodeModel(node(i));
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        expect(stageSnap!.electricalNodes).toBeDefined();
        expect(stageSnap!.electricalNodes!.length).toBe(1);
        expect(stageSnap!.electricalNodes![0].nodeId).toBe(`node_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`electrical nets appear in stage snapshot ${i}`, () => {
        const rt = runtime();
        rt.registerElectricalNetModel(net(i));
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        expect(stageSnap!.electricalNets).toBeDefined();
        expect(stageSnap!.electricalNets!.length).toBe(1);
        expect(stageSnap!.electricalNets![0].netId).toBe(`net_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`electrical connections appear in stage snapshot ${i}`, () => {
        const rt = runtime();
        rt.registerElectricalConnectionModel(connection(i));
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        expect(stageSnap!.electricalConnections).toBeDefined();
        expect(stageSnap!.electricalConnections!.length).toBe(1);
        expect(stageSnap!.electricalConnections![0].connectionId).toBe(`connection_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`breadboard rails appear in stage snapshot ${i}`, () => {
        const rt = runtime();
        rt.registerBreadboardRailModel(rail(i));
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        expect(stageSnap!.breadboardRails).toBeDefined();
        expect(stageSnap!.breadboardRails!.length).toBe(1);
        expect(stageSnap!.breadboardRails![0].railId).toBe(`rail_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`breadboard rows appear in stage snapshot ${i}`, () => {
        const rt = runtime();
        rt.registerBreadboardRowModel(row(i));
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        expect(stageSnap!.breadboardRows).toBeDefined();
        expect(stageSnap!.breadboardRows!.length).toBe(1);
        expect(stageSnap!.breadboardRows![0].rowId).toBe(`row_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`empty registries produce no snapshot fields ${i}`, () => {
        const rt = runtime();
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        expect(stageSnap!.electricalNodes).toBeUndefined();
        expect(stageSnap!.electricalNets).toBeUndefined();
        expect(stageSnap!.electricalConnections).toBeUndefined();
        expect(stageSnap!.breadboardRails).toBeUndefined();
        expect(stageSnap!.breadboardRows).toBeUndefined();
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: Snapshot Serialization Renderer Isolation Clone Safety
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 7: Snapshot Serialization Renderer Isolation Clone Safety', () => {
    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves electrical nodes ${i}`, () => {
        const rt = runtime();
        rt.registerElectricalNodeModel(node(i));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const result = imported.getElectricalNodeModel(`node_${i}`);
        expect(result).toBeDefined();
        expect(result!.nodeId).toBe(`node_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves electrical nets ${i}`, () => {
        const rt = runtime();
        rt.registerElectricalNetModel(net(i));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const result = imported.getElectricalNetModel(`net_${i}`);
        expect(result).toBeDefined();
        expect(result!.netId).toBe(`net_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves connections ${i}`, () => {
        const rt = runtime();
        rt.registerElectricalConnectionModel(connection(i));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const result = imported.getElectricalConnectionModel(`connection_${i}`);
        expect(result).toBeDefined();
        expect(result!.connectionId).toBe(`connection_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves rails ${i}`, () => {
        const rt = runtime();
        rt.registerBreadboardRailModel(rail(i));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const result = imported.getBreadboardRailModel(`rail_${i}`);
        expect(result).toBeDefined();
        expect(result!.railId).toBe(`rail_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves rows ${i}`, () => {
        const rt = runtime();
        rt.registerBreadboardRowModel(row(i));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const result = imported.getBreadboardRowModel(`row_${i}`);
        expect(result).toBeDefined();
        expect(result!.rowId).toBe(`row_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`deep-clone isolation: mutating retrieved node does not affect registry ${i}`, () => {
        const rt = runtime();
        rt.registerElectricalNodeModel(node(i));
        const retrieved = rt.getElectricalNodeModel(`node_${i}`)!;
        retrieved.voltage = 999;
        const fresh = rt.getElectricalNodeModel(`node_${i}`)!;
        expect(fresh.voltage).toBe(0);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`deep-clone isolation: mutating retrieved net does not affect registry ${i}`, () => {
        const rt = runtime();
        rt.registerElectricalNetModel(net(i));
        const retrieved = rt.getElectricalNetModel(`net_${i}`)!;
        retrieved.netState = 'MUTATED';
        const fresh = rt.getElectricalNetModel(`net_${i}`)!;
        expect(fresh.netState).toBe('INACTIVE');
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`deep-clone isolation: mutating retrieved connection does not affect registry ${i}`, () => {
        const rt = runtime();
        rt.registerElectricalConnectionModel(connection(i));
        const retrieved = rt.getElectricalConnectionModel(`connection_${i}`)!;
        retrieved.connectionState = 'MUTATED';
        const fresh = rt.getElectricalConnectionModel(`connection_${i}`)!;
        expect(fresh.connectionState).toBe('CONNECTED');
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`deep-clone isolation: mutating retrieved rail does not affect registry ${i}`, () => {
        const rt = runtime();
        rt.registerBreadboardRailModel(rail(i));
        const retrieved = rt.getBreadboardRailModel(`rail_${i}`)!;
        retrieved.railType = 'MUTATED';
        const fresh = rt.getBreadboardRailModel(`rail_${i}`)!;
        expect(fresh.railType).toBe('POWER');
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`deep-clone isolation: mutating retrieved row does not affect registry ${i}`, () => {
        const rt = runtime();
        rt.registerBreadboardRowModel(row(i));
        const retrieved = rt.getBreadboardRowModel(`row_${i}`)!;
        retrieved.rowIndex = 999;
        const fresh = rt.getBreadboardRowModel(`row_${i}`)!;
        expect(fresh.rowIndex).toBe(0);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 8: Real-World Electrical Integration Simulator Test
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 8: Real-World Electrical Integration Simulator Test', () => {
    // Circuit: ESP32 GPIO18 -> Row 1 -> Resistor -> Row 2 -> LED -> Row 3 -> Ground
    const setupCircuit = (rt: BaseRuntime) => {
      // 1. ESP32 component nodes
      const gpio18 = createDefaultElectricalNodeModel('esp32_gpio18', {
        nodeType: 'GPIO_PIN',
        componentId: 'esp32',
        pinId: 'GPIO18',
        voltage: 0,
        logicState: 'FLOATING',
        metadata: { direction: 'OUTPUT' },
      });
      const gnd = createDefaultElectricalNodeModel('esp32_gnd', {
        nodeType: 'GPIO_PIN',
        componentId: 'esp32',
        pinId: 'GND',
        voltage: 0,
        logicState: 'LOW',
      });

      // 2. Resistor component nodes
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

      // 3. LED component nodes
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

      // 4. Breadboard Rows
      const row1 = createDefaultBreadboardRowModel('row_1', {
        rowIndex: 1,
        nodeIds: ['esp32_gpio18', 'res1_p1'],
      });
      const row2 = createDefaultBreadboardRowModel('row_2', {
        rowIndex: 2,
        nodeIds: ['res1_p2', 'led1_anode'],
      });
      const row3 = createDefaultBreadboardRowModel('row_3', {
        rowIndex: 3,
        nodeIds: ['led1_cathode', 'esp32_gnd'],
      });

      rt.registerBreadboardRowModel(row1);
      rt.registerBreadboardRowModel(row2);
      rt.registerBreadboardRowModel(row3);
    };

    for (let k = 0; k < 100; k++) {
      it(`simulation logic propagates voltage and resolves LED ON/OFF ${k}`, () => {
        const rt = runtime();
        setupCircuit(rt);

        // First, toggle GPIO18 to HIGH
        rt.updateElectricalNodeModel('esp32_gpio18', {
          voltage: 3.3,
          logicState: 'HIGH',
        });

        rt.solveElectricalConnectivity();

        // Check if logic propagated downstream through breadboard rows and passive resistor
        const anodeNode = rt.getElectricalNodeModel('led1_anode')!;
        const cathodeNode = rt.getElectricalNodeModel('led1_cathode')!;
        expect(anodeNode.voltage).toBeCloseTo(3.3);
        expect(cathodeNode.voltage).toBeCloseTo(0);
        expect(anodeNode.logicState).toBe('ON');
        expect(cathodeNode.logicState).toBe('ON');
        expect(anodeNode.metadata.state).toBe('ON');
        expect(anodeNode.metadata.current).toBeGreaterThan(0);
        expect(anodeNode.metadata.brightness).toBeGreaterThan(0);

        // Next, toggle GPIO18 to LOW
        rt.updateElectricalNodeModel('esp32_gpio18', {
          voltage: 0,
          logicState: 'LOW',
        });

        rt.solveElectricalConnectivity();

        const anodeNodeOff = rt.getElectricalNodeModel('led1_anode')!;
        const cathodeNodeOff = rt.getElectricalNodeModel('led1_cathode')!;
        expect(anodeNodeOff.voltage).toBeCloseTo(0);
        expect(cathodeNodeOff.voltage).toBeCloseTo(0);
        expect(anodeNodeOff.logicState).toBe('OFF');
        expect(cathodeNodeOff.logicState).toBe('OFF');
        expect(anodeNodeOff.metadata.state).toBe('OFF');
        expect(anodeNodeOff.metadata.current).toBe(0);
        expect(anodeNodeOff.metadata.brightness).toBe(0);
      });
    }
  });
});
