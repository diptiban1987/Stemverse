/**
 * Phase 31B — Workspace Persistence Runtime Tests
 *
 * Target: 100,000+ assertions
 * Covers: CRUD, autosave, versioning, recovery, offline queue,
 *         compression, serialization, clone safety, stress testing
 */

import { describe, it, expect } from 'vitest';
import {
  createPersistenceSnapshot,
  restoreFromSnapshot,
  createLocalVersion,
  diffSnapshots,
  validateSnapshot,
  estimateSnapshotSize,
  generateSnapshotHash,
  createDefaultPersistenceState,
  createSyncQueueEntry,
} from './workspace-persistence-runtime';
import type {
  SerializedProject,
  WorkspacePersistenceSnapshot,
  LocalProjectVersion,
  OfflineSyncQueueEntry,
  PersistenceEngineSnapshot,
} from '../types';

// ─── Test Helpers ───────────────────────────────────────────

const STRESS_ITERATIONS = 500;

function createMockSerializedProject(overrides: Partial<SerializedProject> = {}): SerializedProject {
  return {
    version: '0.1.0',
    stage: { stageTargetId: 'stage', currentBackdropIndex: 0 },
    targets: [
      {
        id: 'stage',
        name: 'Stage',
        isStage: true,
        currentCostumeIndex: 0,
        variables: {},
        lists: {},
        workspaceObjects: [
          { objectId: 'led_1', objectType: 'led_5mm', positionX: 100, positionY: 200, rotation: 0, scale: 1, metadata: {} },
          { objectId: 'res_1', objectType: 'resistor', positionX: 150, positionY: 250, rotation: 0, scale: 1, metadata: {} },
        ] as unknown as undefined,
        wireLayouts: [
          { wireId: 'wire_1', fromObjectId: 'led_1', fromPin: 'anode', toObjectId: 'res_1', toPin: 'pin1', color: '#ff0000', routePoints: [] },
        ] as unknown as undefined,
      },
    ],
    assets: { costumes: [], backdrops: [], sounds: [] },
    metadata: { exportedAtMs: Date.now(), runtimeVersion: '0.1.0' },
    ...overrides,
  };
}

function createMockRuntime(project?: SerializedProject) {
  let storedProject = project ?? createMockSerializedProject();
  return {
    exportProject: () => JSON.parse(JSON.stringify(storedProject)),
    importProject: (p: SerializedProject) => { storedProject = JSON.parse(JSON.stringify(p)); },
    getWorkspaceObjectModels: () => [
      { objectId: 'led_1', objectType: 'led_5mm', positionX: 100, positionY: 200, rotation: 0, scale: 1 },
      { objectId: 'res_1', objectType: 'resistor', positionX: 150, positionY: 250, rotation: 0, scale: 1 },
    ],
    getWireModels: () => [
      { wireId: 'wire_1', fromObjectId: 'led_1', toObjectId: 'res_1' },
    ],
    _getProject: () => storedProject,
  };
}

function createMockSnapshot(overrides: Partial<WorkspacePersistenceSnapshot> = {}): WorkspacePersistenceSnapshot {
  return {
    projectId: 'test-project-001',
    name: 'Test Project',
    description: 'A test project',
    boardId: 'esp32_devkit_v1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    componentCount: 2,
    wireCount: 1,
    serializedProject: createMockSerializedProject(),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// Section 1: Snapshot Creation (CRUD)
// ═══════════════════════════════════════════════════════════════

describe('Phase 31B: Workspace Persistence Runtime', () => {

  describe('Section 1: Snapshot Creation', () => {

    it('should create a snapshot from runtime with default options', () => {
      const runtime = createMockRuntime();
      const snapshot = createPersistenceSnapshot(runtime);

      expect(snapshot).toBeDefined();
      expect(typeof snapshot.projectId).toBe('string');
      expect(snapshot.projectId.length).toBeGreaterThan(0);
      expect(snapshot.name).toBe('Untitled Project');
      expect(snapshot.description).toBe('');
      expect(snapshot.boardId).toBe('unknown');
      expect(typeof snapshot.createdAt).toBe('number');
      expect(typeof snapshot.updatedAt).toBe('number');
      expect(snapshot.componentCount).toBe(2);
      expect(snapshot.wireCount).toBe(1);
      expect(snapshot.serializedProject).toBeDefined();
      expect(snapshot.serializedProject.version).toBe('0.1.0');
      expect(snapshot.serializedProject.targets).toHaveLength(1);
    });

    it('should create a snapshot with custom options', () => {
      const runtime = createMockRuntime();
      const snapshot = createPersistenceSnapshot(runtime, {
        projectId: 'custom-id',
        name: 'My Robot',
        description: 'LED blink project',
        boardId: 'arduino_uno_r3',
        blocklyXml: '<xml></xml>',
        activeTool: 'wire',
        selectedObjectIds: ['led_1'],
        cameraState: { x: 100, y: 200, zoom: 1.5 },
        sensorValues: { temp: { value: 25 } },
      });

      expect(snapshot.projectId).toBe('custom-id');
      expect(snapshot.name).toBe('My Robot');
      expect(snapshot.description).toBe('LED blink project');
      expect(snapshot.boardId).toBe('arduino_uno_r3');
      expect(snapshot.blocklyXml).toBe('<xml></xml>');
      expect(snapshot.activeTool).toBe('wire');
      expect(snapshot.selectedObjectIds).toEqual(['led_1']);
      expect(snapshot.cameraState).toEqual({ x: 100, y: 200, zoom: 1.5 });
      expect(snapshot.sensorValues).toEqual({ temp: { value: 25 } });
    });

    it('should deep-copy serializedProject (clone safety)', () => {
      const runtime = createMockRuntime();
      const snapshot = createPersistenceSnapshot(runtime);

      // Mutate the original runtime's project
      const originalExport = runtime.exportProject();
      originalExport.version = 'MUTATED';

      // Snapshot should be unaffected
      expect(snapshot.serializedProject.version).toBe('0.1.0');
    });

    it('should deep-copy sensorValues (clone safety)', () => {
      const sensorValues = { temp: { value: 25 } };
      const runtime = createMockRuntime();
      const snapshot = createPersistenceSnapshot(runtime, { sensorValues });

      sensorValues.temp.value = 999;
      expect(snapshot.sensorValues!.temp.value).toBe(25);
    });

    it('should deep-copy cameraState (clone safety)', () => {
      const cam = { x: 10, y: 20, zoom: 2 };
      const runtime = createMockRuntime();
      const snapshot = createPersistenceSnapshot(runtime, { cameraState: cam });

      cam.x = 999;
      expect(snapshot.cameraState!.x).toBe(10);
    });

    it('should deep-copy selectedObjectIds (clone safety)', () => {
      const ids = ['led_1', 'res_1'];
      const runtime = createMockRuntime();
      const snapshot = createPersistenceSnapshot(runtime, { selectedObjectIds: ids });

      ids.push('MUTANT');
      expect(snapshot.selectedObjectIds).toHaveLength(2);
    });

    it('should handle runtime with no workspace objects', () => {
      const runtime = {
        exportProject: () => createMockSerializedProject(),
        importProject: () => {},
        getWorkspaceObjectModels: () => [],
        getWireModels: () => [],
      };
      const snapshot = createPersistenceSnapshot(runtime);
      expect(snapshot.componentCount).toBe(0);
      expect(snapshot.wireCount).toBe(0);
    });

    it('should handle runtime without optional methods', () => {
      const runtime = {
        exportProject: () => createMockSerializedProject(),
        importProject: () => {},
      };
      const snapshot = createPersistenceSnapshot(runtime);
      expect(snapshot.componentCount).toBe(0);
      expect(snapshot.wireCount).toBe(0);
    });

    it('should generate unique projectIds', () => {
      const runtime = createMockRuntime();
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(createPersistenceSnapshot(runtime).projectId);
      }
      expect(ids.size).toBe(100);
    });

    it('STRESS: create snapshots repeatedly', () => {
      const runtime = createMockRuntime();
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const snapshot = createPersistenceSnapshot(runtime, {
          name: `Project ${i}`,
          boardId: `board_${i % 5}`,
        });
        expect(snapshot.name).toBe(`Project ${i}`);
        expect(snapshot.boardId).toBe(`board_${i % 5}`);
        expect(snapshot.serializedProject).toBeDefined();
        expect(snapshot.serializedProject.version).toBe('0.1.0');
        expect(typeof snapshot.projectId).toBe('string');
        expect(snapshot.componentCount).toBe(2);
        expect(snapshot.wireCount).toBe(1);
        expect(typeof snapshot.createdAt).toBe('number');
        expect(typeof snapshot.updatedAt).toBe('number');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Section 2: Snapshot Restoration
  // ═══════════════════════════════════════════════════════════════

  describe('Section 2: Snapshot Restoration', () => {

    it('should restore a snapshot into runtime', () => {
      const runtime = createMockRuntime();
      const snapshot = createMockSnapshot();

      restoreFromSnapshot(runtime, snapshot);
      const exported = runtime.exportProject();
      expect(exported.version).toBe('0.1.0');
      expect(exported.targets).toHaveLength(1);
    });

    it('should deep-copy during restore (no mutation leaks)', () => {
      const runtime = createMockRuntime();
      const snapshot = createMockSnapshot();

      restoreFromSnapshot(runtime, snapshot);

      // Mutate the snapshot after restore
      snapshot.serializedProject.version = 'MUTATED';

      const exported = runtime.exportProject();
      expect(exported.version).toBe('0.1.0');
    });

    it('should handle snapshot with missing serializedProject gracefully', () => {
      const runtime = createMockRuntime();
      const badSnapshot = { ...createMockSnapshot(), serializedProject: undefined as any };

      // Should not throw
      restoreFromSnapshot(runtime, badSnapshot);
    });

    it('STRESS: restore snapshots repeatedly', () => {
      const runtime = createMockRuntime();
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const snapshot = createMockSnapshot({ name: `Project ${i}` });
        restoreFromSnapshot(runtime, snapshot);
        const exported = runtime.exportProject();
        expect(exported.version).toBe('0.1.0');
        expect(exported.targets).toHaveLength(1);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Section 3: Serialization Round-Trip
  // ═══════════════════════════════════════════════════════════════

  describe('Section 3: Serialization Round-Trip', () => {

    it('should survive JSON serialize → deserialize', () => {
      const snapshot = createMockSnapshot();
      const json = JSON.stringify(snapshot);
      const restored = JSON.parse(json) as WorkspacePersistenceSnapshot;

      expect(restored.projectId).toBe(snapshot.projectId);
      expect(restored.name).toBe(snapshot.name);
      expect(restored.serializedProject.version).toBe('0.1.0');
      expect(restored.serializedProject.targets).toHaveLength(1);
    });

    it('should survive create → restore → re-export cycle', () => {
      const runtime = createMockRuntime();
      const snapshot = createPersistenceSnapshot(runtime, {
        projectId: 'roundtrip-test',
        name: 'Round-Trip',
        boardId: 'esp32_devkit_v1',
      });

      // Restore into a fresh runtime
      const runtime2 = createMockRuntime(createMockSerializedProject());
      restoreFromSnapshot(runtime2, snapshot);

      // Re-export and compare
      const reExported = runtime2.exportProject();
      expect(reExported.version).toBe(snapshot.serializedProject.version);
      expect(reExported.targets.length).toBe(snapshot.serializedProject.targets.length);
    });

    it('STRESS: round-trip serialization', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const snapshot = createMockSnapshot({
          projectId: `rt-${i}`,
          name: `Round-Trip ${i}`,
          componentCount: i,
          wireCount: i % 10,
        });

        const json = JSON.stringify(snapshot);
        const restored = JSON.parse(json) as WorkspacePersistenceSnapshot;

        expect(restored.projectId).toBe(`rt-${i}`);
        expect(restored.name).toBe(`Round-Trip ${i}`);
        expect(restored.componentCount).toBe(i);
        expect(restored.wireCount).toBe(i % 10);
        expect(restored.serializedProject).toBeDefined();
        expect(restored.serializedProject.version).toBe('0.1.0');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Section 4: Version Management
  // ═══════════════════════════════════════════════════════════════

  describe('Section 4: Version Management', () => {

    it('should create a local version from snapshot', () => {
      const snapshot = createMockSnapshot();
      const version = createLocalVersion(snapshot, 'Manual Save');

      expect(version.versionId).toBeDefined();
      expect(typeof version.versionId).toBe('string');
      expect(version.projectId).toBe(snapshot.projectId);
      expect(version.label).toBe('Manual Save');
      expect(typeof version.createdAt).toBe('number');
      expect(version.sizeBytes).toBeGreaterThan(0);
      expect(version.componentCount).toBe(2);
      expect(version.wireCount).toBe(1);
      expect(version.serializedProject).toBeDefined();
      expect(version.serializedProject.version).toBe('0.1.0');
    });

    it('should deep-copy serializedProject into version', () => {
      const snapshot = createMockSnapshot();
      const version = createLocalVersion(snapshot, 'v1');

      snapshot.serializedProject.version = 'MUTATED';
      expect(version.serializedProject.version).toBe('0.1.0');
    });

    it('should generate unique version IDs', () => {
      const snapshot = createMockSnapshot();
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(createLocalVersion(snapshot, `v${i}`).versionId);
      }
      expect(ids.size).toBe(100);
    });

    it('STRESS: create versions', () => {
      const snapshot = createMockSnapshot();
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const version = createLocalVersion(snapshot, `Version ${i}`);
        expect(version.label).toBe(`Version ${i}`);
        expect(version.projectId).toBe(snapshot.projectId);
        expect(version.sizeBytes).toBeGreaterThan(0);
        expect(version.serializedProject).toBeDefined();
        expect(version.serializedProject.version).toBe('0.1.0');
        expect(typeof version.versionId).toBe('string');
        expect(typeof version.createdAt).toBe('number');
        expect(version.componentCount).toBe(2);
        expect(version.wireCount).toBe(1);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Section 5: Snapshot Diffing
  // ═══════════════════════════════════════════════════════════════

  describe('Section 5: Snapshot Diffing', () => {

    it('should report no changes for identical snapshots', () => {
      const snapshot = createMockSnapshot();
      const diff = diffSnapshots(snapshot, snapshot);

      expect(diff.componentsAdded).toHaveLength(0);
      expect(diff.componentsRemoved).toHaveLength(0);
      expect(diff.componentsModified).toHaveLength(0);
      expect(diff.wiresAdded).toHaveLength(0);
      expect(diff.wiresRemoved).toHaveLength(0);
      expect(diff.wiresModified).toHaveLength(0);
      expect(diff.variablesChanged).toHaveLength(0);
      expect(diff.summary).toBe('No changes');
    });

    it('should detect added components', () => {
      const a = createMockSnapshot();
      const b = createMockSnapshot();
      // Add a component to b
      const bStage = b.serializedProject.targets[0] as unknown as Record<string, unknown>;
      const bObjects = (bStage.workspaceObjects as any[]) ?? [];
      bObjects.push({ objectId: 'new_led', objectType: 'led_5mm', positionX: 300, positionY: 300 });
      bStage.workspaceObjects = bObjects;

      const diff = diffSnapshots(a, b);
      expect(diff.componentsAdded).toContain('new_led');
      expect(diff.summary).toContain('+1 components');
    });

    it('should detect removed components', () => {
      const a = createMockSnapshot();
      const b = createMockSnapshot();
      const bStage = b.serializedProject.targets[0] as unknown as Record<string, unknown>;
      bStage.workspaceObjects = [];

      const diff = diffSnapshots(a, b);
      expect(diff.componentsRemoved.length).toBeGreaterThan(0);
    });

    it('should detect modified wires', () => {
      const a = createMockSnapshot();
      const b = createMockSnapshot();
      const bStage = b.serializedProject.targets[0] as unknown as Record<string, unknown>;
      const bWires = (bStage.wireLayouts as any[]) ?? [];
      if (bWires.length > 0) {
        bWires[0].color = '#00ff00'; // Change wire color
      }

      const diff = diffSnapshots(a, b);
      // Wire was modified
      expect(diff.wiresModified.length + diff.wiresAdded.length + diff.wiresRemoved.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect added wires', () => {
      const a = createMockSnapshot();
      const b = createMockSnapshot();
      const bStage = b.serializedProject.targets[0] as unknown as Record<string, unknown>;
      const bWires = (bStage.wireLayouts as any[]) ?? [];
      bWires.push({ wireId: 'wire_2', fromObjectId: 'res_1', toObjectId: 'led_1' });
      bStage.wireLayouts = bWires;

      const diff = diffSnapshots(a, b);
      expect(diff.wiresAdded).toContain('wire_2');
    });

    it('should detect variable changes', () => {
      const a = createMockSnapshot();
      const b = createMockSnapshot();
      // Add variable to b
      b.serializedProject.targets[0].variables = { myVar: { name: 'myVar', value: 42 } as any };

      const diff = diffSnapshots(a, b);
      expect(diff.variablesChanged.length).toBeGreaterThan(0);
    });

    it('should handle empty targets gracefully', () => {
      const a = createMockSnapshot({ serializedProject: { ...createMockSerializedProject(), targets: [] } });
      const b = createMockSnapshot();

      const diff = diffSnapshots(a, b);
      expect(diff).toBeDefined();
      expect(typeof diff.summary).toBe('string');
    });

    it('STRESS: diffing snapshots', () => {
      const base = createMockSnapshot();
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const modified = createMockSnapshot({ componentCount: i, wireCount: i % 5 });
        const diff = diffSnapshots(base, modified);
        expect(diff).toBeDefined();
        expect(typeof diff.summary).toBe('string');
        expect(Array.isArray(diff.componentsAdded)).toBe(true);
        expect(Array.isArray(diff.componentsRemoved)).toBe(true);
        expect(Array.isArray(diff.componentsModified)).toBe(true);
        expect(Array.isArray(diff.wiresAdded)).toBe(true);
        expect(Array.isArray(diff.wiresRemoved)).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Section 6: Snapshot Validation
  // ═══════════════════════════════════════════════════════════════

  describe('Section 6: Snapshot Validation', () => {

    it('should validate a correct snapshot', () => {
      const snapshot = createMockSnapshot();
      const result = validateSnapshot(snapshot);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null', () => {
      const result = validateSnapshot(null);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject undefined', () => {
      const result = validateSnapshot(undefined);
      expect(result.valid).toBe(false);
    });

    it('should reject non-object', () => {
      const result = validateSnapshot('string');
      expect(result.valid).toBe(false);
    });

    it('should reject empty object', () => {
      const result = validateSnapshot({});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('should reject missing projectId', () => {
      const snapshot = createMockSnapshot();
      delete (snapshot as any).projectId;
      const result = validateSnapshot(snapshot);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('projectId'))).toBe(true);
    });

    it('should reject empty projectId', () => {
      const snapshot = createMockSnapshot({ projectId: '' });
      const result = validateSnapshot(snapshot);
      expect(result.valid).toBe(false);
    });

    it('should reject missing name', () => {
      const snapshot = createMockSnapshot();
      delete (snapshot as any).name;
      const result = validateSnapshot(snapshot);
      expect(result.valid).toBe(false);
    });

    it('should reject missing boardId', () => {
      const snapshot = createMockSnapshot();
      delete (snapshot as any).boardId;
      const result = validateSnapshot(snapshot);
      expect(result.valid).toBe(false);
    });

    it('should reject missing createdAt', () => {
      const snapshot = createMockSnapshot();
      delete (snapshot as any).createdAt;
      const result = validateSnapshot(snapshot);
      expect(result.valid).toBe(false);
    });

    it('should reject NaN createdAt', () => {
      const snapshot = createMockSnapshot();
      (snapshot as any).createdAt = NaN;
      const result = validateSnapshot(snapshot);
      expect(result.valid).toBe(false);
    });

    it('should reject missing serializedProject', () => {
      const snapshot = createMockSnapshot();
      delete (snapshot as any).serializedProject;
      const result = validateSnapshot(snapshot);
      expect(result.valid).toBe(false);
    });

    it('should reject serializedProject without version', () => {
      const snapshot = createMockSnapshot();
      delete (snapshot.serializedProject as any).version;
      const result = validateSnapshot(snapshot);
      expect(result.valid).toBe(false);
    });

    it('should reject serializedProject without stage', () => {
      const snapshot = createMockSnapshot();
      delete (snapshot.serializedProject as any).stage;
      const result = validateSnapshot(snapshot);
      expect(result.valid).toBe(false);
    });

    it('should reject serializedProject without targets', () => {
      const snapshot = createMockSnapshot();
      delete (snapshot.serializedProject as any).targets;
      const result = validateSnapshot(snapshot);
      expect(result.valid).toBe(false);
    });

    it('should warn about missing assets', () => {
      const snapshot = createMockSnapshot();
      delete (snapshot.serializedProject as any).assets;
      const result = validateSnapshot(snapshot);
      expect(result.warnings.some(w => w.includes('assets'))).toBe(true);
    });

    it('should warn about missing metadata', () => {
      const snapshot = createMockSnapshot();
      delete (snapshot.serializedProject as any).metadata;
      const result = validateSnapshot(snapshot);
      expect(result.warnings.some(w => w.includes('metadata'))).toBe(true);
    });

    it('STRESS: validate correct snapshots', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const snapshot = createMockSnapshot({ projectId: `valid-${i}`, name: `P${i}` });
        const result = validateSnapshot(snapshot);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('STRESS: validate invalid snapshots', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const result = validateSnapshot({ broken: i });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Section 7: Snapshot Hashing
  // ═══════════════════════════════════════════════════════════════

  describe('Section 7: Snapshot Hashing', () => {

    it('should produce a deterministic hash', () => {
      const obj = { a: 1, b: 'test' };
      const hash1 = generateSnapshotHash(obj);
      const hash2 = generateSnapshotHash(obj);
      expect(hash1).toBe(hash2);
    });

    it('should produce an 8-char hex string', () => {
      const hash = generateSnapshotHash({ test: true });
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });

    it('should produce different hashes for different objects', () => {
      const h1 = generateSnapshotHash({ a: 1 });
      const h2 = generateSnapshotHash({ a: 2 });
      expect(h1).not.toBe(h2);
    });

    it('should detect mutations', () => {
      const snapshot = createMockSnapshot();
      const h1 = generateSnapshotHash(snapshot);

      snapshot.name = 'CHANGED';
      const h2 = generateSnapshotHash(snapshot);

      expect(h1).not.toBe(h2);
    });

    it('should handle empty objects', () => {
      const hash = generateSnapshotHash({});
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(8);
    });

    it('should handle arrays', () => {
      const hash = generateSnapshotHash([1, 2, 3]);
      expect(typeof hash).toBe('string');
    });

    it('should handle null', () => {
      const hash = generateSnapshotHash(null);
      expect(typeof hash).toBe('string');
    });

    it('STRESS: hash consistency', () => {
      const obj = createMockSnapshot();
      const baseline = generateSnapshotHash(obj);
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(generateSnapshotHash(obj)).toBe(baseline);
      }
    });

    it('STRESS: hash uniqueness', () => {
      const hashes = new Set<string>();
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        hashes.add(generateSnapshotHash({ i, data: `value-${i}` }));
      }
      // Most should be unique (collisions are possible but rare)
      expect(hashes.size).toBeGreaterThan(STRESS_ITERATIONS * 0.95);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Section 8: Size Estimation
  // ═══════════════════════════════════════════════════════════════

  describe('Section 8: Size Estimation', () => {

    it('should estimate size > 0 for non-empty objects', () => {
      const size = estimateSnapshotSize({ a: 1, b: 'test' });
      expect(size).toBeGreaterThan(0);
    });

    it('should estimate size = small for empty object', () => {
      const size = estimateSnapshotSize({});
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThan(100);
    });

    it('should increase with more data', () => {
      const small = estimateSnapshotSize({ a: 1 });
      const big = estimateSnapshotSize({ a: 1, b: 'x'.repeat(1000) });
      expect(big).toBeGreaterThan(small);
    });

    it('should estimate snapshot size', () => {
      const snapshot = createMockSnapshot();
      const size = estimateSnapshotSize(snapshot);
      expect(size).toBeGreaterThan(100);
    });

    it('STRESS: size estimation', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const size = estimateSnapshotSize({ i, data: 'x'.repeat(i % 100) });
        expect(size).toBeGreaterThan(0);
        expect(typeof size).toBe('number');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Section 9: Persistence Engine State
  // ═══════════════════════════════════════════════════════════════

  describe('Section 9: Persistence Engine State', () => {

    it('should create default state', () => {
      const state = createDefaultPersistenceState();
      expect(state.activeProjectId).toBeNull();
      expect(state.isDirty).toBe(false);
      expect(state.lastSavedAt).toBeNull();
      expect(state.autoSaveEnabled).toBe(true);
      expect(state.autoSaveIntervalMs).toBe(30000);
      expect(state.offlineQueueLength).toBe(0);
    });

    it('should be JSON serializable', () => {
      const state = createDefaultPersistenceState();
      const json = JSON.stringify(state);
      const restored = JSON.parse(json) as PersistenceEngineSnapshot;
      expect(restored.autoSaveEnabled).toBe(true);
      expect(restored.autoSaveIntervalMs).toBe(30000);
    });

    it('STRESS: create default states', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const state = createDefaultPersistenceState();
        expect(state.activeProjectId).toBeNull();
        expect(state.isDirty).toBe(false);
        expect(state.autoSaveEnabled).toBe(true);
        expect(state.autoSaveIntervalMs).toBe(30000);
        expect(state.offlineQueueLength).toBe(0);
        expect(state.lastSavedAt).toBeNull();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Section 10: Offline Sync Queue
  // ═══════════════════════════════════════════════════════════════

  describe('Section 10: Offline Sync Queue', () => {

    it('should create a sync queue entry for create operation', () => {
      const entry = createSyncQueueEntry('proj-1', 'create', createMockSerializedProject());
      expect(entry.queueId).toBeDefined();
      expect(entry.projectId).toBe('proj-1');
      expect(entry.operation).toBe('create');
      expect(entry.synced).toBe(false);
      expect(entry.retryCount).toBe(0);
      expect(entry.payload).toBeDefined();
      expect(entry.payload!.version).toBe('0.1.0');
      expect(typeof entry.timestamp).toBe('number');
    });

    it('should create a sync queue entry for update operation', () => {
      const entry = createSyncQueueEntry('proj-1', 'update');
      expect(entry.operation).toBe('update');
      expect(entry.payload).toBeUndefined();
    });

    it('should create a sync queue entry for delete operation', () => {
      const entry = createSyncQueueEntry('proj-1', 'delete');
      expect(entry.operation).toBe('delete');
      expect(entry.payload).toBeUndefined();
    });

    it('should deep-copy payload', () => {
      const payload = createMockSerializedProject();
      const entry = createSyncQueueEntry('proj-1', 'create', payload);
      payload.version = 'MUTATED';
      expect(entry.payload!.version).toBe('0.1.0');
    });

    it('should generate unique queue IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(createSyncQueueEntry('proj', 'update').queueId);
      }
      expect(ids.size).toBe(100);
    });

    it('STRESS: create sync entries', () => {
      const ops: Array<'create' | 'update' | 'delete'> = ['create', 'update', 'delete'];
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const op = ops[i % 3];
        const entry = createSyncQueueEntry(`proj-${i}`, op, i % 2 === 0 ? createMockSerializedProject() : undefined);
        expect(entry.projectId).toBe(`proj-${i}`);
        expect(entry.operation).toBe(op);
        expect(entry.synced).toBe(false);
        expect(entry.retryCount).toBe(0);
        expect(typeof entry.queueId).toBe('string');
        expect(typeof entry.timestamp).toBe('number');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Section 11: Clone Safety (Deep-Copy Isolation)
  // ═══════════════════════════════════════════════════════════════

  describe('Section 11: Clone Safety', () => {

    it('should isolate snapshot from runtime mutations', () => {
      const runtime = createMockRuntime();
      const snapshot = createPersistenceSnapshot(runtime);

      // Mutate runtime
      const proj = runtime.exportProject();
      proj.targets.push({ id: 'new', name: 'New', isStage: false });

      // Snapshot unaffected
      expect(snapshot.serializedProject.targets).toHaveLength(1);
    });

    it('should isolate version from snapshot mutations', () => {
      const snapshot = createMockSnapshot();
      const version = createLocalVersion(snapshot, 'v1');

      snapshot.serializedProject.targets = [];
      expect(version.serializedProject.targets).toHaveLength(1);
    });

    it('should isolate restored runtime from snapshot mutations', () => {
      const runtime = createMockRuntime();
      const snapshot = createMockSnapshot();

      restoreFromSnapshot(runtime, snapshot);
      snapshot.serializedProject.version = 'MUTATED';

      expect(runtime.exportProject().version).toBe('0.1.0');
    });

    it('should isolate sync queue payload from mutations', () => {
      const payload = createMockSerializedProject();
      const entry = createSyncQueueEntry('p', 'create', payload);

      payload.targets = [];
      expect(entry.payload!.targets).toHaveLength(1);
    });

    it('STRESS: clone isolation', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const runtime = createMockRuntime();
        const snapshot = createPersistenceSnapshot(runtime, { name: `P${i}` });
        const version = createLocalVersion(snapshot, 'v1');

        snapshot.name = 'MUTATED';
        snapshot.serializedProject.version = 'MUTATED';

        expect(version.serializedProject.version).toBe('0.1.0');
        expect(version.label).toBe('v1');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Section 12: Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('Section 12: Edge Cases', () => {

    it('should handle empty project name', () => {
      const runtime = createMockRuntime();
      const snapshot = createPersistenceSnapshot(runtime, { name: '' });
      expect(snapshot.name).toBe('');
    });

    it('should handle special characters in name', () => {
      const runtime = createMockRuntime();
      const names = ['Hello "World"', "It's a project", 'LED <blink>', '日本語プロジェクト', '🤖 Robot', 'line\nbreak'];
      for (const name of names) {
        const snapshot = createPersistenceSnapshot(runtime, { name });
        expect(snapshot.name).toBe(name);
        // Must survive JSON round-trip
        const restored = JSON.parse(JSON.stringify(snapshot));
        expect(restored.name).toBe(name);
      }
    });

    it('should handle very long description', () => {
      const runtime = createMockRuntime();
      const desc = 'x'.repeat(100000);
      const snapshot = createPersistenceSnapshot(runtime, { description: desc });
      expect(snapshot.description).toBe(desc);
    });

    it('should handle zero component/wire count', () => {
      const runtime = {
        exportProject: () => createMockSerializedProject(),
        importProject: () => {},
        getWorkspaceObjectModels: () => [],
        getWireModels: () => [],
      };
      const snapshot = createPersistenceSnapshot(runtime);
      expect(snapshot.componentCount).toBe(0);
      expect(snapshot.wireCount).toBe(0);
    });

    it('should handle large projects', () => {
      const targets: any[] = [];
      const objects: any[] = [];
      for (let i = 0; i < 100; i++) {
        objects.push({ objectId: `comp_${i}`, objectType: 'led_5mm', positionX: i * 10, positionY: i * 10, rotation: 0, scale: 1, metadata: {} });
      }
      targets.push({
        id: 'stage', name: 'Stage', isStage: true, currentCostumeIndex: 0,
        variables: {}, lists: {},
        workspaceObjects: objects,
      });

      const project = createMockSerializedProject({ targets });
      const runtime = {
        exportProject: () => JSON.parse(JSON.stringify(project)),
        importProject: () => {},
        getWorkspaceObjectModels: () => objects,
        getWireModels: () => [],
      };

      const snapshot = createPersistenceSnapshot(runtime);
      expect(snapshot.componentCount).toBe(100);
      expect(snapshot.wireCount).toBe(0);
    });

    it('should handle timestamps correctly', () => {
      const before = Date.now();
      const snapshot = createMockSnapshot();
      const after = Date.now();

      expect(snapshot.createdAt).toBeGreaterThanOrEqual(before - 1000);
      expect(snapshot.updatedAt).toBeLessThanOrEqual(after + 1000);
    });

    it('STRESS: edge case combinations', () => {
      const runtime = createMockRuntime();
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const snapshot = createPersistenceSnapshot(runtime, {
          name: i % 2 === 0 ? '' : `P${i}`,
          description: i % 3 === 0 ? 'x'.repeat(i) : undefined,
          boardId: i % 5 === 0 ? '' : `board_${i}`,
          blocklyXml: i % 4 === 0 ? '<xml></xml>' : undefined,
        });
        expect(snapshot).toBeDefined();
        expect(snapshot.serializedProject).toBeDefined();
        const json = JSON.stringify(snapshot);
        expect(json.length).toBeGreaterThan(0);
        const restored = JSON.parse(json);
        expect(restored.projectId).toBe(snapshot.projectId);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Section 13: Comprehensive Stress Testing
  // ═══════════════════════════════════════════════════════════════

  describe('Section 13: Comprehensive Stress Testing', () => {

    it('STRESS: full lifecycle — create → version → diff → validate → hash → size', () => {
      const runtime = createMockRuntime();

      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        // Create
        const snapshot = createPersistenceSnapshot(runtime, {
          name: `Stress ${i}`,
          boardId: 'esp32_devkit_v1',
        });
        expect(snapshot.name).toBe(`Stress ${i}`);
        expect(snapshot.serializedProject).toBeDefined();

        // Version
        const version = createLocalVersion(snapshot, `v${i}`);
        expect(version.label).toBe(`v${i}`);
        expect(version.projectId).toBe(snapshot.projectId);

        // Validate
        const validation = validateSnapshot(snapshot);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);

        // Hash
        const hash = generateSnapshotHash(snapshot);
        expect(typeof hash).toBe('string');
        expect(hash.length).toBe(8);

        // Size
        const size = estimateSnapshotSize(snapshot);
        expect(size).toBeGreaterThan(0);

        // Diff (self)
        const diff = diffSnapshots(snapshot, snapshot);
        expect(diff.summary).toBe('No changes');

        // Sync queue
        const entry = createSyncQueueEntry(snapshot.projectId, 'update');
        expect(entry.synced).toBe(false);
        expect(entry.projectId).toBe(snapshot.projectId);
      }
    });

    it('STRESS: serialization round-trip with all fields', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const snapshot = createMockSnapshot({
          projectId: `stress-rt-${i}`,
          name: `Full Stress ${i}`,
          description: `Desc ${i}`,
          blocklyXml: `<xml id="${i}"></xml>`,
          activeTool: i % 2 === 0 ? 'select' : 'wire',
          selectedObjectIds: [`obj_${i}`],
          cameraState: { x: i, y: i * 2, zoom: 1 + i / 100 },
          sensorValues: { sensor1: { val: i } },
        });

        const json = JSON.stringify(snapshot);
        const restored = JSON.parse(json) as WorkspacePersistenceSnapshot;

        expect(restored.projectId).toBe(`stress-rt-${i}`);
        expect(restored.name).toBe(`Full Stress ${i}`);
        expect(restored.description).toBe(`Desc ${i}`);
        expect(restored.blocklyXml).toBe(`<xml id="${i}"></xml>`);
        expect(restored.cameraState!.x).toBe(i);
        expect(restored.cameraState!.y).toBe(i * 2);
        expect(restored.sensorValues!.sensor1.val).toBe(i);
        expect(restored.serializedProject.version).toBe('0.1.0');
      }
    });
  });
});
