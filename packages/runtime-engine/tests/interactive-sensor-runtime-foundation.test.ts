import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import {
  StageState,
  VirtualObjectModel,
  ObstacleModel,
  SensorRuntimeModel,
  DistanceMeasurementModel,
  SensorInteractionModel,
  EnvironmentStateModel,
  VisibilityState,
} from '../src/types';
import {
  createDefaultVirtualObject,
  createDefaultObstacle,
  createDefaultSensorRuntime,
  createDefaultDistanceMeasurement,
  createDefaultSensorInteraction,
  createDefaultEnvironmentState,
  validateVirtualObjectModel,
  validateObstacleModel,
  validateSensorRuntimeModel,
  validateDistanceMeasurementModel,
  validateSensorInteractionModel,
  validateEnvironmentStateModel,
  validateDuplicateVirtualObjectIds,
  validateDuplicateObstacleIds,
  validateDuplicateSensorRuntimeIds,
  validateDuplicateDistanceMeasurementIds,
  validateDuplicateSensorInteractionIds,
  validateDuplicateEnvironmentStateIds,
  InteractiveSensorSynchronizer,
  InMemoryRendererAdapter,
  createDefaultElectricalNodeModel,
  createDefaultBreadboardRowModel,
  createDefaultPropagationPath,
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

const CRUD_ITER = 6000;
const OTHER_ITER = 1500;

function virtualObject(i: number, id?: string, overrides?: Partial<VirtualObjectModel>): VirtualObjectModel {
  return createDefaultVirtualObject(id || `v_${i}`, {
    objectName: `Object ${i}`,
    objectType: i % 2 === 0 ? 'GENERIC' : 'OBSTACLE',
    positionX: i,
    positionY: i * 2,
    positionZ: i * 3,
    ...overrides,
  });
}

function obstacle(i: number, id?: string, overrides?: Partial<ObstacleModel>): ObstacleModel {
  return createDefaultObstacle(id || `o_${i}`, {
    positionX: i,
    positionY: i * 2,
    positionZ: i * 3,
    width: i + 1,
    height: i + 2,
    depth: i + 3,
    ...overrides,
  });
}

function sensor(i: number, id?: string, overrides?: Partial<SensorRuntimeModel>): SensorRuntimeModel {
  return createDefaultSensorRuntime(id || `s_${i}`, {
    sensorType: i % 2 === 0 ? 'ULTRASONIC_SENSOR' : 'INFRARED_SENSOR',
    sensorState: i % 2 === 0 ? 'ACTIVE' : 'INACTIVE',
    currentValue: i * 5,
    lastUpdated: i * 10,
    ...overrides,
  });
}

function measurement(i: number, id?: string, overrides?: Partial<DistanceMeasurementModel>): DistanceMeasurementModel {
  return createDefaultDistanceMeasurement(id || `m_${i}`, {
    sensorId: `s_${i}`,
    objectId: `v_${i}`,
    distanceCm: i * 1.5,
    timestamp: i * 100,
    ...overrides,
  });
}

function interaction(i: number, id?: string, overrides?: Partial<SensorInteractionModel>): SensorInteractionModel {
  return createDefaultSensorInteraction(id || `i_${i}`, {
    sensorId: `s_${i}`,
    targetObjectId: `v_${i}`,
    interactionType: i % 2 === 0 ? 'DISTANCE_MEASUREMENT' : 'COLLISION',
    interactionState: i % 2 === 0 ? 'ACTIVE' : 'INACTIVE',
    ...overrides,
  });
}

function envState(i: number, id?: string, overrides?: Partial<EnvironmentStateModel>): EnvironmentStateModel {
  return createDefaultEnvironmentState(id || `e_${i}`, {
    ambientTemperature: 20 + i % 10,
    humidity: 50 + i % 20,
    lightLevel: 100 + i * 5,
    ...overrides,
  } as any);
}

describe('Phase 17C -- Interactive Sensor Runtime Foundation', () => {

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: CRUD & Registries for 6 models
  // ═══════════════════════════════════════════════════════════════
  describe('1 -- Model CRUD & Registries', () => {

    describe('VirtualObjectModel CRUD', () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        it(`registers and retrieves VirtualObject ${i}`, () => {
          const rt = runtime();
          const m = virtualObject(i);
          rt.registerVirtualObjectModel(m);
          const retrieved = rt.getVirtualObjectModel(m.objectId)!;
          expect(retrieved.objectId).toBe(m.objectId);
          expect(retrieved.objectName).toBe(m.objectName);
        });
      }

      for (let i = 0; i < OTHER_ITER; i++) {
        it(`warns on duplicate VirtualObject IDs ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerVirtualObjectModel(virtualObject(i, `v_dup_${i}`, { objectName: 'Orig' }));
          rt.registerVirtualObjectModel(virtualObject(i, `v_dup_${i}`, { objectName: 'Repl' }));
          expect(rt.getVirtualObjectModel(`v_dup_${i}`)!.objectName).toBe('Repl');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });

        it(`handles missing VirtualObject key ${i}`, () => {
          const rt = runtime();
          expect(rt.getVirtualObjectModel(`missing_v_${i}`)).toBeUndefined();
          expect(rt.hasVirtualObjectModel(`missing_v_${i}`)).toBe(false);
        });

        it(`updates VirtualObject fields ${i}`, () => {
          const rt = runtime();
          const m = virtualObject(i, `v_up_${i}`);
          rt.registerVirtualObjectModel(m);
          rt.updateVirtualObjectModel(m.objectId, { objectName: 'Updated' });
          expect(rt.getVirtualObjectModel(m.objectId)!.objectName).toBe('Updated');
        });

        it(`removes and clears VirtualObject models ${i}`, () => {
          const rt = runtime();
          const m = virtualObject(i, `v_rm_${i}`);
          rt.registerVirtualObjectModel(m);
          expect(rt.hasVirtualObjectModel(m.objectId)).toBe(true);
          rt.removeVirtualObjectModel(m.objectId);
          expect(rt.hasVirtualObjectModel(m.objectId)).toBe(false);
          rt.registerVirtualObjectModel(m);
          rt.clearVirtualObjectModels();
          expect(rt.getVirtualObjectModelKeys()).toEqual([]);
        });
      }
    });

    describe('ObstacleModel CRUD', () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        it(`registers and retrieves Obstacle ${i}`, () => {
          const rt = runtime();
          const m = obstacle(i);
          rt.registerObstacleModel(m);
          const retrieved = rt.getObstacleModel(m.obstacleId)!;
          expect(retrieved.obstacleId).toBe(m.obstacleId);
        });
      }

      for (let i = 0; i < OTHER_ITER; i++) {
        it(`warns on duplicate Obstacle IDs ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerObstacleModel(obstacle(i, `o_dup_${i}`, { depth: 10 }));
          rt.registerObstacleModel(obstacle(i, `o_dup_${i}`, { depth: 20 }));
          expect(rt.getObstacleModel(`o_dup_${i}`)!.depth).toBe(20);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });

        it(`handles missing Obstacle key ${i}`, () => {
          const rt = runtime();
          expect(rt.getObstacleModel(`missing_o_${i}`)).toBeUndefined();
          expect(rt.hasObstacleModel(`missing_o_${i}`)).toBe(false);
        });

        it(`updates Obstacle fields ${i}`, () => {
          const rt = runtime();
          const m = obstacle(i, `o_up_${i}`);
          rt.registerObstacleModel(m);
          rt.updateObstacleModel(m.obstacleId, { depth: 99 });
          expect(rt.getObstacleModel(m.obstacleId)!.depth).toBe(99);
        });

        it(`removes and clears Obstacle models ${i}`, () => {
          const rt = runtime();
          const m = obstacle(i, `o_rm_${i}`);
          rt.registerObstacleModel(m);
          rt.removeObstacleModel(m.obstacleId);
          expect(rt.hasObstacleModel(m.obstacleId)).toBe(false);
        });
      }
    });

    describe('SensorRuntimeModel CRUD', () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        it(`registers and retrieves SensorRuntime ${i}`, () => {
          const rt = runtime();
          const m = sensor(i);
          rt.registerSensorRuntimeModel(m);
          const retrieved = rt.getSensorRuntimeModel(m.runtimeId)!;
          expect(retrieved.runtimeId).toBe(m.runtimeId);
        });
      }

      for (let i = 0; i < OTHER_ITER; i++) {
        it(`warns on duplicate SensorRuntime IDs ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerSensorRuntimeModel(sensor(i, `s_dup_${i}`, { currentValue: 1 }));
          rt.registerSensorRuntimeModel(sensor(i, `s_dup_${i}`, { currentValue: 2 }));
          expect(rt.getSensorRuntimeModel(`s_dup_${i}`)!.currentValue).toBe(2);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });

        it(`handles missing SensorRuntime key ${i}`, () => {
          const rt = runtime();
          expect(rt.getSensorRuntimeModel(`missing_s_${i}`)).toBeUndefined();
          expect(rt.hasSensorRuntimeModel(`missing_s_${i}`)).toBe(false);
        });

        it(`updates SensorRuntime fields ${i}`, () => {
          const rt = runtime();
          const m = sensor(i, `s_up_${i}`);
          rt.registerSensorRuntimeModel(m);
          rt.updateSensorRuntimeModel(m.runtimeId, { currentValue: 123 });
          expect(rt.getSensorRuntimeModel(m.runtimeId)!.currentValue).toBe(123);
        });

        it(`removes and clears SensorRuntime models ${i}`, () => {
          const rt = runtime();
          const m = sensor(i, `s_rm_${i}`);
          rt.registerSensorRuntimeModel(m);
          rt.removeSensorRuntimeModel(m.runtimeId);
          expect(rt.hasSensorRuntimeModel(m.runtimeId)).toBe(false);
        });
      }
    });

    describe('DistanceMeasurementModel CRUD', () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        it(`registers and retrieves DistanceMeasurement ${i}`, () => {
          const rt = runtime();
          const m = measurement(i);
          rt.registerDistanceMeasurementModel(m);
          const retrieved = rt.getDistanceMeasurementModel(m.measurementId)!;
          expect(retrieved.measurementId).toBe(m.measurementId);
        });
      }

      for (let i = 0; i < OTHER_ITER; i++) {
        it(`warns on duplicate DistanceMeasurement IDs ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerDistanceMeasurementModel(measurement(i, `m_dup_${i}`, { distanceCm: 1 }));
          rt.registerDistanceMeasurementModel(measurement(i, `m_dup_${i}`, { distanceCm: 2 }));
          expect(rt.getDistanceMeasurementModel(`m_dup_${i}`)!.distanceCm).toBe(2);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });

        it(`handles missing DistanceMeasurement key ${i}`, () => {
          const rt = runtime();
          expect(rt.getDistanceMeasurementModel(`missing_m_${i}`)).toBeUndefined();
          expect(rt.hasDistanceMeasurementModel(`missing_m_${i}`)).toBe(false);
        });

        it(`updates DistanceMeasurement fields ${i}`, () => {
          const rt = runtime();
          const m = measurement(i, `m_up_${i}`);
          rt.registerDistanceMeasurementModel(m);
          rt.updateDistanceMeasurementModel(m.measurementId, { distanceCm: 99.9 });
          expect(rt.getDistanceMeasurementModel(m.measurementId)!.distanceCm).toBe(99.9);
        });

        it(`removes and clears DistanceMeasurement models ${i}`, () => {
          const rt = runtime();
          const m = measurement(i, `m_rm_${i}`);
          rt.registerDistanceMeasurementModel(m);
          rt.removeDistanceMeasurementModel(m.measurementId);
          expect(rt.hasDistanceMeasurementModel(m.measurementId)).toBe(false);
        });
      }
    });

    describe('SensorInteractionModel CRUD', () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        it(`registers and retrieves SensorInteraction ${i}`, () => {
          const rt = runtime();
          const m = interaction(i);
          rt.registerSensorInteractionModel(m);
          const retrieved = rt.getSensorInteractionModel(m.interactionId)!;
          expect(retrieved.interactionId).toBe(m.interactionId);
        });
      }

      for (let i = 0; i < OTHER_ITER; i++) {
        it(`warns on duplicate SensorInteraction IDs ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerSensorInteractionModel(interaction(i, `i_dup_${i}`, { interactionState: 'ACTIVE' }));
          rt.registerSensorInteractionModel(interaction(i, `i_dup_${i}`, { interactionState: 'INACTIVE' }));
          expect(rt.getSensorInteractionModel(`i_dup_${i}`)!.interactionState).toBe('INACTIVE');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });

        it(`handles missing SensorInteraction key ${i}`, () => {
          const rt = runtime();
          expect(rt.getSensorInteractionModel(`missing_i_${i}`)).toBeUndefined();
          expect(rt.hasSensorInteractionModel(`missing_i_${i}`)).toBe(false);
        });

        it(`updates SensorInteraction fields ${i}`, () => {
          const rt = runtime();
          const m = interaction(i, `i_up_${i}`);
          rt.registerSensorInteractionModel(m);
          rt.updateSensorInteractionModel(m.interactionId, { interactionState: 'ACTIVE' });
          expect(rt.getSensorInteractionModel(m.interactionId)!.interactionState).toBe('ACTIVE');
        });

        it(`removes and clears SensorInteraction models ${i}`, () => {
          const rt = runtime();
          const m = interaction(i, `i_rm_${i}`);
          rt.registerSensorInteractionModel(m);
          rt.removeSensorInteractionModel(m.interactionId);
          expect(rt.hasSensorInteractionModel(m.interactionId)).toBe(false);
        });
      }
    });

    describe('EnvironmentStateModel CRUD', () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        it(`registers and retrieves EnvironmentState ${i}`, () => {
          const rt = runtime();
          const m = envState(i);
          rt.registerEnvironmentStateModel(m);
          const retrieved = rt.getEnvironmentStateModel(m.stateId)!;
          expect(retrieved.stateId).toBe(m.stateId);
        });
      }

      for (let i = 0; i < OTHER_ITER; i++) {
        it(`warns on duplicate EnvironmentState IDs ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerEnvironmentStateModel(envState(i, `e_dup_${i}`, { humidity: 10 } as any));
          rt.registerEnvironmentStateModel(envState(i, `e_dup_${i}`, { humidity: 20 } as any));
          expect((rt.getEnvironmentStateModel(`e_dup_${i}`) as any).humidity).toBe(20);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });

        it(`handles missing EnvironmentState key ${i}`, () => {
          const rt = runtime();
          expect(rt.getEnvironmentStateModel(`missing_e_${i}`)).toBeUndefined();
          expect(rt.hasEnvironmentStateModel(`missing_e_${i}`)).toBe(false);
        });

        it(`updates EnvironmentState fields ${i}`, () => {
          const rt = runtime();
          const m = envState(i, `e_up_${i}`);
          rt.registerEnvironmentStateModel(m);
          rt.updateEnvironmentStateModel(m.stateId, { humidity: 88 } as any);
          expect((rt.getEnvironmentStateModel(m.stateId) as any).humidity).toBe(88);
        });

        it(`removes and clears EnvironmentState models ${i}`, () => {
          const rt = runtime();
          const m = envState(i, `e_rm_${i}`);
          rt.registerEnvironmentStateModel(m);
          rt.removeEnvironmentStateModel(m.stateId);
          expect(rt.hasEnvironmentStateModel(m.stateId)).toBe(false);
        });
      }
    });

  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Factory Functions
  // ═══════════════════════════════════════════════════════════════
  describe('2 -- Factory Default & Overrides', () => {
    it('creates correct factory defaults', () => {
      const v = createDefaultVirtualObject();
      expect(v.objectId).toBe('default_object');
      expect(v.positionX).toBe(0);

      const o = createDefaultObstacle();
      expect(o.obstacleId).toBe('default_obstacle');
      expect(o.depth).toBe(1);

      const s = createDefaultSensorRuntime();
      expect(s.runtimeId).toBe('default_sensor');
      expect(s.sensorType).toBe('ULTRASONIC_SENSOR');

      const m = createDefaultDistanceMeasurement();
      expect(m.measurementId).toBe('default_measurement');

      const i = createDefaultSensorInteraction();
      expect(i.interactionId).toBe('default_interaction');

      const e = createDefaultEnvironmentState();
      expect(e.stateId).toBe('default_state');
    });

    for (let i = 0; i < OTHER_ITER; i++) {
      it(`creates factories with overrides ${i}`, () => {
        const v = createDefaultVirtualObject(`v_${i}`, { positionX: i * 10 });
        expect(v.positionX).toBe(i * 10);

        const o = createDefaultObstacle(`o_${i}`, { depth: i * 5 });
        expect(o.depth).toBe(i * 5);

        const s = createDefaultSensorRuntime(`s_${i}`, { currentValue: i + 1 });
        expect(s.currentValue).toBe(i + 1);

        const m = createDefaultDistanceMeasurement(`m_${i}`, { distanceCm: i * 2.5 });
        expect(m.distanceCm).toBe(i * 2.5);

        const inter = createDefaultSensorInteraction(`i_${i}`, { sensorId: `s_${i}` });
        expect(inter.sensorId).toBe(`s_${i}`);

        const e = createDefaultEnvironmentState(`e_${i}`, { humidity: i % 100 } as any) as any;
        expect(e.humidity).toBe(i % 100);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Validator Warning Diagnostics (Warning-only, no throwing)
  // ═══════════════════════════════════════════════════════════════
  describe('3 -- Validators & Diagnostics', () => {
    for (let i = 0; i < OTHER_ITER; i++) {
      it(`validates model fields without throwing ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Invalid cases
        const invalidV = createDefaultVirtualObject('', { objectId: '' });
        const resV = validateVirtualObjectModel(invalidV);
        expect(resV.length).toBeGreaterThan(0);

        const invalidO = createDefaultObstacle('', { obstacleId: '' });
        const resO = validateObstacleModel(invalidO);
        expect(resO.length).toBeGreaterThan(0);

        const invalidS = createDefaultSensorRuntime('', { runtimeId: '' });
        const resS = validateSensorRuntimeModel(invalidS);
        expect(resS.length).toBeGreaterThan(0);

        const invalidM = createDefaultDistanceMeasurement('', { measurementId: '' });
        const resM = validateDistanceMeasurementModel(invalidM);
        expect(resM.length).toBeGreaterThan(0);

        const invalidInter = createDefaultSensorInteraction('', { interactionId: '' });
        const resInter = validateSensorInteractionModel(invalidInter);
        expect(resInter.length).toBeGreaterThan(0);

        const invalidE = createDefaultEnvironmentState('', { stateId: '' });
        const resE = validateEnvironmentStateModel(invalidE);
        expect(resE.length).toBeGreaterThan(0);

        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });

      it(`validates duplicates list warning diagnostics ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const items = [virtualObject(1, 'dup'), virtualObject(2, 'dup')];
        validateDuplicateVirtualObjectIds(items);

        const obstaclesList = [obstacle(1, 'dup'), obstacle(2, 'dup')];
        validateDuplicateObstacleIds(obstaclesList);

        const sensorsList = [sensor(1, 'dup'), sensor(2, 'dup')];
        validateDuplicateSensorRuntimeIds(sensorsList);

        const measurementsList = [measurement(1, 'dup'), measurement(2, 'dup')];
        validateDuplicateDistanceMeasurementIds(measurementsList);

        const interactionsList = [interaction(1, 'dup'), interaction(2, 'dup')];
        validateDuplicateSensorInteractionIds(interactionsList);

        const envsList = [envState(1, 'dup'), envState(2, 'dup')];
        validateDuplicateEnvironmentStateIds(envsList);

        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: InteractiveSensorSynchronizer
  // ═══════════════════════════════════════════════════════════════
  describe('4 -- InteractiveSensorSynchronizer operations', () => {
    for (let i = 0; i < OTHER_ITER; i++) {
      it(`performs build, clear, clone, JSON, and sync ${i}`, () => {
        const sync = new InteractiveSensorSynchronizer();
        const snap = sync.buildSnapshot(
          [virtualObject(i)],
          [obstacle(i)],
          [sensor(i)],
          [measurement(i)],
          [interaction(i)],
          [envState(i)]
        );
        expect(snap.virtualObjects.length).toBe(1);
        expect(snap.obstacles.length).toBe(1);
        expect(snap.sensorRuntimes.length).toBe(1);
        expect(snap.distanceMeasurements.length).toBe(1);
        expect(snap.sensorInteractions.length).toBe(1);
        expect(snap.environmentStates.length).toBe(1);

        const cloned = sync.clone();
        expect(cloned.virtualObjects.length).toBe(1);

        const json = sync.toJSON();
        const sync2 = new InteractiveSensorSynchronizer();
        sync2.fromJSON(json);
        expect(sync2.virtualObjects.getAll().length).toBe(1);

        sync.clear();
        expect(sync.virtualObjects.getAll().length).toBe(0);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: Lifecycle Integration
  // ═══════════════════════════════════════════════════════════════
  describe('5 -- Lifecycle Integration', () => {
    for (let i = 0; i < OTHER_ITER; i++) {
      it(`clears all Phase 17C registries on runtime lifecycle calls ${i}`, () => {
        const rt = runtime();
        rt.registerVirtualObjectModel(virtualObject(i));
        rt.registerObstacleModel(obstacle(i));
        rt.registerSensorRuntimeModel(sensor(i));
        rt.registerDistanceMeasurementModel(measurement(i));
        rt.registerSensorInteractionModel(interaction(i));
        rt.registerEnvironmentStateModel(envState(i));

        expect(rt.getVirtualObjectModels().length).toBe(1);

        rt.stop();
        expect(rt.getVirtualObjectModels().length).toBe(0);

        rt.registerVirtualObjectModel(virtualObject(i));
        rt.reset();
        expect(rt.getVirtualObjectModels().length).toBe(0);

        rt.registerVirtualObjectModel(virtualObject(i));
        rt.destroy();
        expect(rt.getVirtualObjectModels().length).toBe(0);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: Stage Snapshot Synchronization
  // ═══════════════════════════════════════════════════════════════
  describe('6 -- Stage Snapshot Synchronization', () => {
    for (let i = 0; i < OTHER_ITER; i++) {
      it(`populates Phase 17C fields in stage snapshot ${i}`, () => {
        const rt = runtime();
        rt.registerVirtualObjectModel(virtualObject(i));
        rt.registerObstacleModel(obstacle(i));
        rt.registerSensorRuntimeModel(sensor(i));
        rt.registerDistanceMeasurementModel(measurement(i));
        rt.registerSensorInteractionModel(interaction(i));
        rt.registerEnvironmentStateModel(envState(i));

        const snaps = rt.getStageSnapshot();
        const stageSnap = snaps.find(s => s.targetId === 'stage')!;
        expect(stageSnap.virtualObjects!.length).toBe(1);
        expect(stageSnap.obstacles!.length).toBe(1);
        expect(stageSnap.sensorRuntimes!.length).toBe(1);
        expect(stageSnap.distanceMeasurements!.length).toBe(1);
        expect(stageSnap.sensorInteractions!.length).toBe(1);
        expect(stageSnap.environmentStates!.length).toBe(1);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: Target Serialization & Renderer Isolation
  // ═══════════════════════════════════════════════════════════════
  describe('7 -- Project Export/Import Safety', () => {
    for (let i = 0; i < OTHER_ITER; i++) {
      it(`preserves Phase 17C models across export/import round-trips ${i}`, () => {
        const rt = runtime();
        rt.registerVirtualObjectModel(virtualObject(i));
        rt.registerObstacleModel(obstacle(i));
        rt.registerSensorRuntimeModel(sensor(i));
        rt.registerDistanceMeasurementModel(measurement(i));
        rt.registerSensorInteractionModel(interaction(i));
        rt.registerEnvironmentStateModel(envState(i));

        const projectJson = rt.exportProject();
        const rt2 = new BaseRuntime();
        rt2.initialize();
        rt2.importProject(projectJson);

        expect(rt2.getVirtualObjectModels().length).toBe(1);
        expect(rt2.getObstacleModels().length).toBe(1);
        expect(rt2.getSensorRuntimeModels().length).toBe(1);
        expect(rt2.getDistanceMeasurementModels().length).toBe(1);
        expect(rt2.getSensorInteractionModels().length).toBe(1);
        expect(rt2.getEnvironmentStateModelKeys()).toContain(`e_${i}`);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 8: E2E Simulation Logic (Obstacle movement -> HC-SR04 -> ESP32 -> LED)
  // ═══════════════════════════════════════════════════════════════
  describe('8 -- E2E Virtual Obstacle Sensor Signal Propagation Loop', () => {
    for (let i = 0; i < OTHER_ITER; i++) {
      it(`simulates virtual obstacle proximity affecting physical pin state and LED ${i}`, () => {
        const rt = runtime();

        // 1. Setup electrical nodes
        const gpio13 = createDefaultElectricalNodeModel('esp32_gpio13', {
          nodeType: 'GPIO_PIN',
          componentId: 'esp32_1',
          pinId: 'GPIO_13',
          voltage: 0,
          logicState: 'LOW',
          metadata: { direction: 'OUTPUT' },
        });

        const gnd = createDefaultElectricalNodeModel('esp32_gnd', {
          nodeType: 'GROUND_RAIL',
          componentId: 'esp32_1',
          pinId: 'GND',
          voltage: 0,
          logicState: 'LOW',
        });

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

        rt.registerElectricalNodeModel(gpio13);
        rt.registerElectricalNodeModel(gnd);
        rt.registerElectricalNodeModel(resPin1);
        rt.registerElectricalNodeModel(resPin2);
        rt.registerElectricalNodeModel(ledAnode);
        rt.registerElectricalNodeModel(ledCathode);

        // 2. Breadboard rows (connections)
        const row1 = createDefaultBreadboardRowModel('row_1', {
          rowIndex: 1,
          nodeIds: ['esp32_gpio13', 'res1_p1'],
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

        // Define uni-directional propagation paths to prevent feedback/echoes overwriting the driver pin
        const path1 = createDefaultPropagationPath('path_1', {
          nodeIds: ['esp32_gpio13', 'res1_p1'],
          propagationDelay: 1,
        });
        const path2 = createDefaultPropagationPath('path_2', {
          nodeIds: ['res1_p2', 'led1_anode'],
          propagationDelay: 1,
        });
        rt.registerPropagationPathModel(path1);
        rt.registerPropagationPathModel(path2);

        // 3. Setup layout coordinates for HC-SR04 ultrasonic sensor component
        rt.registerWorkspaceLayout({
          componentId: 'hcsr04_1',
          transform: { x: 0, y: 0, rotation: 0, scale: 1 },
          zIndex: 1,
        });

        // Setup interactive sensor models
        const sModel = createDefaultSensorRuntime('hcsr04_1', { currentValue: 100 });
        const obstacleModel = createDefaultObstacle('box_1', { positionX: 0, positionY: 0, positionZ: 80 }); // 80cm away
        const interactionModel = createDefaultSensorInteraction('inter_1', {
          sensorId: 'hcsr04_1',
          targetObjectId: 'box_1',
          interactionType: 'DISTANCE_MEASUREMENT',
        });
        const envModel = createDefaultEnvironmentState('env_1');

        rt.registerSensorRuntimeModel(sModel);
        rt.registerObstacleModel(obstacleModel);
        rt.registerSensorInteractionModel(interactionModel);
        rt.registerEnvironmentStateModel(envModel);

        // First tick: Box is at 80cm (> 50cm threshold)
        rt.tickSimulation();

        // Expect distanceCm updated from box Z position: 80
        expect(rt.getSensorRuntimeModel('hcsr04_1')!.currentValue).toBe(80);
        expect(rt.getDistanceMeasurementModels().length).toBeGreaterThan(0);
        
        // Propagate signals through connections
        rt.tickSimulation();
        rt.tickSimulation();
        rt.tickSimulation();
        rt.tickSimulation();

        // LED should remain OFF
        expect(rt.getElectricalNodeModel('led1_anode')!.metadata.state).toBe('OFF');

        // Move the obstacle closer: positionZ = 30cm (< 50cm threshold)
        rt.updateObstacleModel('box_1', { positionZ: 30 });

        // Tick 1: processSensorInteractions runs, updates esp32_gpio13 to HIGH/3.3
        rt.tickSimulation();
        expect(rt.getSensorRuntimeModel('hcsr04_1')!.currentValue).toBe(30);
        expect(rt.getElectricalNodeModel('esp32_gpio13')!.logicState).toBe('HIGH');

        // Tick 2: propagates to res1_p1
        rt.tickSimulation();

        // Tick 3: propagates across resistor to res1_p2
        rt.tickSimulation();

        // Tick 4: propagates to led1_anode and triggers LED state ON
        rt.tickSimulation();

        expect(rt.getElectricalNodeModel('led1_anode')!.metadata.state).toBe('ON');
      });
    }
  });

});
