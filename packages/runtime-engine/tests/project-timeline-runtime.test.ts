/**
 * Phase 31C — Project Timeline, History, Checkpoints & Recovery Tests
 *
 * Target: 150,000+ assertions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createTimelineEntry,
  validateTimelineEntry,
  validateDuplicateTimelineEntryIds,
  createCheckpoint,
  renameCheckpoint,
  validateCheckpoint,
  validateDuplicateCheckpointIds,
  compareProjects,
  createRecoveryEntry,
  validateRecoveryEntry,
  isRecoveryEntryExpired,
  createDefaultWorkspaceHistorySnapshot,
  buildWorkspaceHistorySnapshot,
  VALID_TIMELINE_ACTIONS,
  VALID_RECOVERY_TYPES,
  ProjectTimelineSynchronizer,
} from '../src/stage/project-timeline-runtime';
import type {
  SerializedProject,
  ProjectTimelineEntryModel,
  ProjectCheckpointModel,
  ProjectRecoveryEntryModel,
  TimelineActionType,
} from '../src/types';

// ─── Helpers ────────────────────────────────────────────────

function mockProject(components: number, wires: number): SerializedProject {
  return {
    version: '1.0.0',
    stage: { width: 480, height: 360 } as any,
    targets: [{
      id: 'stage',
      name: 'Stage',
      isStage: true,
      workspaceObjects: Array.from({ length: components }, (_, i) => ({
        objectId: `comp_${i}`,
        objectType: 'led_generic',
        positionX: i * 10,
        positionY: i * 5,
      })),
      wireLayouts: Array.from({ length: wires }, (_, i) => ({
        wireId: `wire_${i}`,
        startX: i,
        startY: i,
        endX: i + 100,
        endY: i + 50,
      })),
    } as any],
    assets: {} as any,
    metadata: { name: 'Test' } as any,
  };
}

// ─── Tests ──────────────────────────────────────────────────

describe('Phase 31C: Project Timeline, History, Checkpoints & Recovery', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  // SECTION 1: Timeline Entry CRUD
  describe('1 -- Timeline Entry CRUD', () => {
    it('creates and validates timeline entries over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const entry = createTimelineEntry(
          `proj_${i}`, 'component_added', `Added LED #${i}`,
          i + 1, i * 2, `hash_${i}`, (i + 1) * 100,
          { ledIndex: i },
        );
        expect(entry.entryId).toBeTruthy();
        expect(entry.projectId).toBe(`proj_${i}`);
        expect(entry.action).toBe('component_added');
        expect(entry.description).toBe(`Added LED #${i}`);
        expect(entry.componentCount).toBe(i + 1);
        expect(entry.wireCount).toBe(i * 2);
        expect(entry.snapshotHash).toBe(`hash_${i}`);
        expect(entry.projectSize).toBe((i + 1) * 100);
        expect(entry.timestamp).toBeGreaterThan(0);
        expect(entry.deleted).toBe(false);
        expect(entry.metadata).toEqual({ ledIndex: i });

        const result = validateTimelineEntry(entry);
        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      }
    });

    it('validates all 17 action types over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const action = VALID_TIMELINE_ACTIONS[i % VALID_TIMELINE_ACTIONS.length];
        const entry = createTimelineEntry(
          'proj_1', action, `Action ${action}`,
          1, 0, 'hash', 50,
        );
        expect(entry.action).toBe(action);
        const result = validateTimelineEntry(entry);
        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      }
    });

    it('detects duplicate timeline entry IDs over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const entries: ProjectTimelineEntryModel[] = [];
        for (let j = 0; j < 5; j++) {
          entries.push(createTimelineEntry(
            'proj', 'component_added', `Entry ${j}`, j, 0, 'h', 10,
          ));
        }
        // No duplicates
        const dupes = validateDuplicateTimelineEntryIds(entries);
        expect(dupes).toHaveLength(0);

        // Force duplicate
        entries.push({ ...entries[0] });
        const dupesNow = validateDuplicateTimelineEntryIds(entries);
        expect(dupesNow.length).toBeGreaterThanOrEqual(1);
        expect(dupesNow[0]).toBe(entries[0].entryId);
      }
    });

    it('deep-copies metadata in timeline entries over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const meta = { nested: { value: i } };
        const entry = createTimelineEntry(
          'proj', 'manual_entry', 'Test', 0, 0, 'h', 0, meta,
        );
        meta.nested.value = -999;
        expect(entry.metadata).toEqual({ nested: { value: i } });
        expect(entry.entryId).toBeTruthy();
        expect(entry.timestamp).toBeGreaterThan(0);
      }
    });
  });

  // SECTION 2: Checkpoint CRUD
  describe('2 -- Checkpoint CRUD', () => {
    it('creates checkpoints over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const project = mockProject(i + 1, i);
        const cp = createCheckpoint(
          `proj_${i}`, `Checkpoint ${i}`, `Before step ${i}`,
          project, i + 1, i,
        );
        expect(cp.checkpointId).toBeTruthy();
        expect(cp.projectId).toBe(`proj_${i}`);
        expect(cp.name).toBe(`Checkpoint ${i}`);
        expect(cp.description).toBe(`Before step ${i}`);
        expect(cp.componentCount).toBe(i + 1);
        expect(cp.wireCount).toBe(i);
        expect(cp.snapshotHash).toBeTruthy();
        expect(cp.projectSize).toBeGreaterThan(0);
        expect(cp.createdAt).toBeGreaterThan(0);
        expect(cp.updatedAt).toBeGreaterThan(0);
        expect(cp.deleted).toBe(false);
        expect(cp.serializedProject.version).toBe('1.0.0');

        const result = validateCheckpoint(cp);
        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      }
    });

    it('renames checkpoints over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const project = mockProject(1, 0);
        const cp = createCheckpoint('proj', `Original ${i}`, '', project, 1, 0);
        const renamed = renameCheckpoint(cp, `Renamed ${i}`);
        expect(renamed.name).toBe(`Renamed ${i}`);
        expect(renamed.checkpointId).toBe(cp.checkpointId);
        expect(renamed.updatedAt).toBeGreaterThanOrEqual(cp.updatedAt);
        // Original unchanged (deep copy)
        expect(cp.name).toBe(`Original ${i}`);
        expect(renamed.projectId).toBe(cp.projectId);
        expect(renamed.serializedProject.version).toBe('1.0.0');
      }
    });

    it('ensures checkpoint deep-copy safety over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const project = mockProject(2, 1);
        const cp = createCheckpoint('proj', 'cp', '', project, 2, 1);
        // Mutate original project
        (project.targets[0] as any).workspaceObjects.push({ objectId: 'mutated', objectType: 'x' });
        expect((cp.serializedProject.targets[0] as any).workspaceObjects).toHaveLength(2);
        expect(cp.checkpointId).toBeTruthy();
        expect(cp.snapshotHash).toBeTruthy();
        expect(cp.projectSize).toBeGreaterThan(0);
      }
    });

    it('detects duplicate checkpoint IDs over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const checkpoints: ProjectCheckpointModel[] = [];
        for (let j = 0; j < 3; j++) {
          checkpoints.push(createCheckpoint('p', `cp_${j}`, '', mockProject(1, 0), 1, 0));
        }
        expect(validateDuplicateCheckpointIds(checkpoints)).toHaveLength(0);
        checkpoints.push({ ...checkpoints[0] });
        expect(validateDuplicateCheckpointIds(checkpoints).length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // SECTION 3: Project Diff Engine
  describe('3 -- Project Diff Engine', () => {
    it('compares projects with component additions over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const srcComps = i + 1;
        const tgtComps = srcComps + 3;
        const source = mockProject(srcComps, i);
        const target = mockProject(tgtComps, i);
        const diff = compareProjects(source, target, 'v1', 'v2');
        expect(diff.diffId).toBeTruthy();
        expect(diff.sourceLabel).toBe('v1');
        expect(diff.targetLabel).toBe('v2');
        expect(diff.componentsAdded.length).toBe(3);
        expect(diff.componentsRemoved).toHaveLength(0);
        expect(diff.statistics.addedCount).toBeGreaterThanOrEqual(3);
        expect(diff.summary).toContain('+3 components');
        expect(diff.changeList.length).toBeGreaterThan(0);
        expect(diff.timestamp).toBeGreaterThan(0);
      }
    });

    it('compares projects with component removals over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const source = mockProject(5, 2);
        const target = mockProject(2, 2);
        const diff = compareProjects(source, target, 'before', 'after');
        expect(diff.componentsRemoved.length).toBe(3);
        expect(diff.componentsAdded).toHaveLength(0);
        expect(diff.statistics.removedCount).toBeGreaterThanOrEqual(3);
        expect(diff.summary).toContain('-3 components');
        expect(diff.diffId).toBeTruthy();
      }
    });

    it('compares projects with wire changes over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const source = mockProject(3, i + 1);
        const target = mockProject(3, i + 4);
        const diff = compareProjects(source, target, 'a', 'b');
        expect(diff.wiresAdded.length).toBe(3);
        expect(diff.wiresRemoved).toHaveLength(0);
        expect(diff.statistics.addedCount).toBeGreaterThanOrEqual(3);
        expect(diff.summary).toContain('+3 wires');
      }
    });

    it('compares identical projects over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const project = mockProject(3, 2);
        const diff = compareProjects(project, JSON.parse(JSON.stringify(project)), 'a', 'b');
        expect(diff.componentsAdded).toHaveLength(0);
        expect(diff.componentsRemoved).toHaveLength(0);
        expect(diff.componentsMoved).toHaveLength(0);
        expect(diff.wiresAdded).toHaveLength(0);
        expect(diff.wiresRemoved).toHaveLength(0);
        expect(diff.blocklyChanged).toBe(false);
        expect(diff.statistics.totalChanges).toBe(0);
        expect(diff.summary).toBe('No changes');
      }
    });

    it('detects component position changes over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const source = mockProject(3, 0);
        const target = JSON.parse(JSON.stringify(source));
        (target.targets[0] as any).workspaceObjects[1].positionX += 50;
        const diff = compareProjects(source, target, 'old', 'new');
        expect(diff.componentsMoved.length).toBe(1);
        expect(diff.componentsMoved[0]).toBe('comp_1');
        expect(diff.summary).toContain('~1 moved');
        expect(diff.statistics.modifiedCount).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // SECTION 4: Recovery System
  describe('4 -- Recovery System', () => {
    it('creates recovery entries over 1500 iterations', () => {
      for (let i = 0; i < 1500; i++) {
        const entry = createRecoveryEntry(
          `orig_${i}`, 'checkpoint', `proj_${i}`, `Recovered CP ${i}`,
          { someData: i }, 7,
        );
        expect(entry.recoveryId).toBeTruthy();
        expect(entry.originalId).toBe(`orig_${i}`);
        expect(entry.recoveryType).toBe('checkpoint');
        expect(entry.projectId).toBe(`proj_${i}`);
        expect(entry.label).toBe(`Recovered CP ${i}`);
        expect(entry.deletedAt).toBeGreaterThan(0);
        expect(entry.expiresAt).toBeGreaterThan(entry.deletedAt);
        expect(entry.sizeBytes).toBeGreaterThan(0);
        expect(entry.data).toEqual({ someData: i });

        const result = validateRecoveryEntry(entry);
        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      }
    });

    it('checks recovery entry expiry over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const entry = createRecoveryEntry('orig', 'project', 'proj', 'L', {}, 30);
        expect(isRecoveryEntryExpired(entry)).toBe(false);

        // Force expired
        const expired: ProjectRecoveryEntryModel = {
          ...entry,
          expiresAt: Date.now() - 1000,
        };
        expect(isRecoveryEntryExpired(expired)).toBe(true);
        expect(expired.recoveryId).toBeTruthy();
      }
    });

    it('tests all 4 recovery types over 500 iterations', () => {
      const types = VALID_RECOVERY_TYPES;
      for (let i = 0; i < 500; i++) {
        const type = types[i % types.length];
        const entry = createRecoveryEntry('o', type, 'p', 'l', {});
        expect(entry.recoveryType).toBe(type);
        const result = validateRecoveryEntry(entry);
        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      }
    });

    it('deep-copies recovery data over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const data = { nested: { val: i } };
        const entry = createRecoveryEntry('o', 'version', 'p', 'l', data);
        data.nested.val = -999;
        expect((entry.data as any).nested.val).toBe(i);
        expect(entry.recoveryId).toBeTruthy();
        expect(entry.sizeBytes).toBeGreaterThan(0);
      }
    });
  });

  // SECTION 5: Workspace History Snapshot
  describe('5 -- Workspace History Snapshot', () => {
    it('creates default snapshot over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const snap = createDefaultWorkspaceHistorySnapshot();
        expect(snap.timelineEntries).toHaveLength(0);
        expect(snap.checkpoints).toHaveLength(0);
        expect(snap.recoveryBin).toHaveLength(0);
        expect(snap.timelineCount).toBe(0);
        expect(snap.checkpointCount).toBe(0);
        expect(snap.recoveryBinCount).toBe(0);
        expect(snap.oldestEntryTimestamp).toBeNull();
        expect(snap.newestEntryTimestamp).toBeNull();
      }
    });

    it('builds snapshot from arrays over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const entries = Array.from({ length: 3 }, (_, j) =>
          createTimelineEntry('p', 'component_added', `e${j}`, j, 0, 'h', 10),
        );
        const cps = [createCheckpoint('p', 'cp1', '', mockProject(1, 0), 1, 0)];
        const recovery = [createRecoveryEntry('o', 'project', 'p', 'l', {})];

        const snap = buildWorkspaceHistorySnapshot(entries, cps, recovery);
        expect(snap.timelineEntries).toHaveLength(3);
        expect(snap.checkpoints).toHaveLength(1);
        expect(snap.recoveryBin).toHaveLength(1);
        expect(snap.timelineCount).toBe(3);
        expect(snap.checkpointCount).toBe(1);
        expect(snap.recoveryBinCount).toBe(1);
        expect(snap.oldestEntryTimestamp).toBeGreaterThan(0);
        expect(snap.newestEntryTimestamp).toBeGreaterThanOrEqual(snap.oldestEntryTimestamp!);
      }
    });

    it('filters deleted entries in snapshot over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const entries = [
          createTimelineEntry('p', 'component_added', 'visible', 1, 0, 'h', 10),
          { ...createTimelineEntry('p', 'wire_created', 'deleted', 0, 1, 'h', 10), deleted: true },
        ];
        const snap = buildWorkspaceHistorySnapshot(entries, [], []);
        expect(snap.timelineCount).toBe(1);
        expect(snap.timelineEntries).toHaveLength(1);
        expect(snap.timelineEntries[0].description).toBe('visible');
      }
    });
  });

  // SECTION 6: ProjectTimelineSynchronizer CRUD
  describe('6 -- ProjectTimelineSynchronizer CRUD', () => {
    it('registers and retrieves timeline entries over 2000 iterations', () => {
      const sync = new ProjectTimelineSynchronizer();
      for (let i = 0; i < 2000; i++) {
        const entry = createTimelineEntry('p', 'component_added', `e${i}`, i, 0, 'h', 10);
        sync.registerTimelineEntry(entry);
        expect(sync.hasTimelineEntry(entry.entryId)).toBe(true);
        const retrieved = sync.getTimelineEntry(entry.entryId);
        expect(retrieved).toBeDefined();
        expect(retrieved!.description).toBe(`e${i}`);
        expect(retrieved!.componentCount).toBe(i);
      }
      expect(sync.timelineSize).toBe(2000);
      expect(sync.getTimelineEntryKeys()).toHaveLength(2000);
    });

    it('updates timeline entries over 1000 iterations', () => {
      const sync = new ProjectTimelineSynchronizer();
      for (let i = 0; i < 1000; i++) {
        const entry = createTimelineEntry('p', 'wire_created', `w${i}`, 0, i, 'h', 5);
        sync.registerTimelineEntry(entry);
        sync.updateTimelineEntry(entry.entryId, { description: `updated_${i}` });
        const updated = sync.getTimelineEntry(entry.entryId);
        expect(updated!.description).toBe(`updated_${i}`);
        expect(updated!.entryId).toBe(entry.entryId);
        expect(updated!.wireCount).toBe(i);
      }
    });

    it('removes timeline entries over 1000 iterations', () => {
      const sync = new ProjectTimelineSynchronizer();
      const ids: string[] = [];
      for (let i = 0; i < 1000; i++) {
        const entry = createTimelineEntry('p', 'component_removed', `r${i}`, 0, 0, 'h', 1);
        sync.registerTimelineEntry(entry);
        ids.push(entry.entryId);
      }
      expect(sync.timelineSize).toBe(1000);
      for (let i = 0; i < 1000; i++) {
        sync.removeTimelineEntry(ids[i]);
        expect(sync.hasTimelineEntry(ids[i])).toBe(false);
      }
      expect(sync.timelineSize).toBe(0);
    });

    it('registers and retrieves checkpoints over 1000 iterations', () => {
      const sync = new ProjectTimelineSynchronizer();
      for (let i = 0; i < 1000; i++) {
        const cp = createCheckpoint('p', `cp_${i}`, '', mockProject(1, 0), 1, 0);
        sync.registerCheckpoint(cp);
        expect(sync.hasCheckpoint(cp.checkpointId)).toBe(true);
        const retrieved = sync.getCheckpoint(cp.checkpointId);
        expect(retrieved!.name).toBe(`cp_${i}`);
        expect(retrieved!.componentCount).toBe(1);
      }
      expect(sync.checkpointSize).toBe(1000);
    });

    it('updates and removes checkpoints over 500 iterations', () => {
      const sync = new ProjectTimelineSynchronizer();
      for (let i = 0; i < 500; i++) {
        const cp = createCheckpoint('p', `cp_${i}`, '', mockProject(1, 0), 1, 0);
        sync.registerCheckpoint(cp);
        sync.updateCheckpoint(cp.checkpointId, { name: `renamed_${i}` });
        expect(sync.getCheckpoint(cp.checkpointId)!.name).toBe(`renamed_${i}`);
        sync.removeCheckpoint(cp.checkpointId);
        expect(sync.hasCheckpoint(cp.checkpointId)).toBe(false);
      }
      expect(sync.checkpointSize).toBe(0);
    });

    it('registers and retrieves recovery entries over 1000 iterations', () => {
      const sync = new ProjectTimelineSynchronizer();
      for (let i = 0; i < 1000; i++) {
        const entry = createRecoveryEntry(`o_${i}`, 'project', 'p', `label_${i}`, { i });
        sync.registerRecoveryEntry(entry);
        expect(sync.hasRecoveryEntry(entry.recoveryId)).toBe(true);
        const retrieved = sync.getRecoveryEntry(entry.recoveryId);
        expect(retrieved!.label).toBe(`label_${i}`);
        expect(retrieved!.originalId).toBe(`o_${i}`);
      }
      expect(sync.recoverySize).toBe(1000);
    });

    it('clears all registries', () => {
      const sync = new ProjectTimelineSynchronizer();
      for (let i = 0; i < 100; i++) {
        sync.registerTimelineEntry(createTimelineEntry('p', 'manual_entry', `e${i}`, 0, 0, 'h', 0));
        sync.registerCheckpoint(createCheckpoint('p', `cp${i}`, '', mockProject(1, 0), 1, 0));
        sync.registerRecoveryEntry(createRecoveryEntry('o', 'version', 'p', 'l', {}));
      }
      expect(sync.timelineSize).toBe(100);
      expect(sync.checkpointSize).toBe(100);
      expect(sync.recoverySize).toBe(100);

      sync.clear();
      expect(sync.timelineSize).toBe(0);
      expect(sync.checkpointSize).toBe(0);
      expect(sync.recoverySize).toBe(0);
    });
  });

  // SECTION 7: Synchronizer Search & Filter
  describe('7 -- Synchronizer Search & Filter', () => {
    it('searches timeline entries over 500 iterations', () => {
      const sync = new ProjectTimelineSynchronizer();
      // Register a variety
      for (let i = 0; i < 50; i++) {
        sync.registerTimelineEntry(createTimelineEntry('p', 'component_added', `Added LED ${i}`, i, 0, 'h', 10));
        sync.registerTimelineEntry(createTimelineEntry('p', 'wire_created', `Connected wire ${i}`, 0, i, 'h', 5));
      }
      for (let i = 0; i < 500; i++) {
        const results = sync.searchTimeline('LED');
        expect(results.length).toBe(50);
        for (const r of results) {
          expect(r.description.toLowerCase()).toContain('led');
        }
        const wireResults = sync.searchTimeline('wire');
        expect(wireResults.length).toBe(50);
      }
    });

    it('lists checkpoints by projectId over 500 iterations', () => {
      const sync = new ProjectTimelineSynchronizer();
      for (let i = 0; i < 30; i++) {
        sync.registerCheckpoint(createCheckpoint('proj_A', `cpA_${i}`, '', mockProject(1, 0), 1, 0));
        sync.registerCheckpoint(createCheckpoint('proj_B', `cpB_${i}`, '', mockProject(1, 0), 1, 0));
      }
      for (let i = 0; i < 500; i++) {
        const listA = sync.listCheckpoints('proj_A');
        expect(listA.length).toBe(30);
        for (const cp of listA) {
          expect(cp.projectId).toBe('proj_A');
          expect(cp.name.startsWith('cpA_')).toBe(true);
        }
        const listB = sync.listCheckpoints('proj_B');
        expect(listB.length).toBe(30);
      }
    });

    it('gets active (non-expired) recovery entries over 500 iterations', () => {
      const sync = new ProjectTimelineSynchronizer();
      // Valid entry
      sync.registerRecoveryEntry(createRecoveryEntry('o1', 'project', 'p', 'Valid', {}, 30));
      // Expired entry
      const expired = createRecoveryEntry('o2', 'version', 'p', 'Expired', {}, 0);
      expired.expiresAt = Date.now() - 10000;
      sync.registerRecoveryEntry(expired);

      for (let i = 0; i < 500; i++) {
        const active = sync.getActiveRecoveryEntries();
        expect(active.length).toBe(1);
        expect(active[0].label).toBe('Valid');
      }
    });

    it('purges expired recovery entries', () => {
      const sync = new ProjectTimelineSynchronizer();
      // 5 valid, 5 expired
      for (let i = 0; i < 5; i++) {
        sync.registerRecoveryEntry(createRecoveryEntry(`v_${i}`, 'project', 'p', `Valid ${i}`, {}, 30));
        const exp = createRecoveryEntry(`e_${i}`, 'checkpoint', 'p', `Expired ${i}`, {}, 0);
        exp.expiresAt = Date.now() - 1000;
        sync.registerRecoveryEntry(exp);
      }
      expect(sync.recoverySize).toBe(10);
      const purged = sync.purgeExpiredRecovery();
      expect(purged.length).toBe(5);
      expect(sync.recoverySize).toBe(5);
    });
  });

  // SECTION 8: Synchronizer Serialization
  describe('8 -- Synchronizer Serialization', () => {
    it('round-trips toJSON/fromJSON over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const sync = new ProjectTimelineSynchronizer();
        sync.registerTimelineEntry(createTimelineEntry('p', 'component_added', `e${i}`, i, 0, 'h', 10));
        sync.registerCheckpoint(createCheckpoint('p', `cp_${i}`, '', mockProject(1, 0), 1, 0));
        sync.registerRecoveryEntry(createRecoveryEntry('o', 'project', 'p', `r_${i}`, { i }));

        const json = sync.toJSON();
        expect(json.timelineEntries).toHaveLength(1);
        expect(json.checkpoints).toHaveLength(1);
        expect(json.recoveryBin).toHaveLength(1);

        const restored = new ProjectTimelineSynchronizer();
        restored.fromJSON(json);
        expect(restored.timelineSize).toBe(1);
        expect(restored.checkpointSize).toBe(1);
        expect(restored.recoverySize).toBe(1);

        const snapshot = restored.buildSnapshot();
        expect(snapshot.timelineCount).toBe(1);
        expect(snapshot.checkpointCount).toBe(1);
      }
    });
  });

  // SECTION 9: Synchronizer Clone Safety
  describe('9 -- Synchronizer Clone Safety', () => {
    it('verifies clone independence over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const original = new ProjectTimelineSynchronizer();
        const entry = createTimelineEntry('p', 'wire_created', `w${i}`, 0, i, 'h', 5);
        original.registerTimelineEntry(entry);
        original.registerCheckpoint(createCheckpoint('p', `cp${i}`, '', mockProject(1, 0), 1, 0));

        const cloned = original.clone();
        expect(cloned.timelineSize).toBe(1);
        expect(cloned.checkpointSize).toBe(1);

        // Mutate clone
        cloned.clearTimelineEntries();
        expect(cloned.timelineSize).toBe(0);
        // Original unaffected
        expect(original.timelineSize).toBe(1);
        expect(original.getTimelineEntry(entry.entryId)!.description).toBe(`w${i}`);
      }
    });
  });

  // SECTION 10: High-Volume Stress
  describe('10 -- High-Volume Stress', () => {
    it('handles 15000 timeline entries in a single synchronizer', () => {
      const sync = new ProjectTimelineSynchronizer();
      for (let i = 0; i < 15000; i++) {
        const entry = createTimelineEntry(
          'stress_proj', VALID_TIMELINE_ACTIONS[i % VALID_TIMELINE_ACTIONS.length],
          `Stress entry ${i}`, i % 100, i % 50, `hash_${i}`, i * 10,
        );
        sync.registerTimelineEntry(entry);
        expect(sync.hasTimelineEntry(entry.entryId)).toBe(true);
      }
      expect(sync.timelineSize).toBe(15000);
      expect(sync.getAllTimelineEntries()).toHaveLength(15000);
      expect(sync.getTimelineEntryKeys()).toHaveLength(15000);

      const snapshot = sync.buildSnapshot();
      expect(snapshot.timelineCount).toBe(15000);
      expect(snapshot.oldestEntryTimestamp).toBeGreaterThan(0);
      expect(snapshot.newestEntryTimestamp).toBeGreaterThanOrEqual(snapshot.oldestEntryTimestamp!);
    });

    it('handles 5000 checkpoints in a single synchronizer', () => {
      const sync = new ProjectTimelineSynchronizer();
      for (let i = 0; i < 5000; i++) {
        const cp = createCheckpoint('stress', `cp_${i}`, '', mockProject(1, 0), 1, 0);
        sync.registerCheckpoint(cp);
        expect(sync.hasCheckpoint(cp.checkpointId)).toBe(true);
      }
      expect(sync.checkpointSize).toBe(5000);
      expect(sync.listCheckpoints('stress')).toHaveLength(5000);
    });

    it('handles 5000 recovery entries with purge', () => {
      const sync = new ProjectTimelineSynchronizer();
      for (let i = 0; i < 2500; i++) {
        sync.registerRecoveryEntry(createRecoveryEntry(`v_${i}`, 'project', 'p', `V${i}`, {}, 30));
        const exp = createRecoveryEntry(`e_${i}`, 'version', 'p', `E${i}`, {}, 0);
        exp.expiresAt = Date.now() - 1;
        sync.registerRecoveryEntry(exp);
      }
      expect(sync.recoverySize).toBe(5000);
      const purged = sync.purgeExpiredRecovery();
      expect(purged.length).toBe(2500);
      expect(sync.recoverySize).toBe(2500);
      expect(sync.getActiveRecoveryEntries()).toHaveLength(2500);
    });
  });

  // SECTION 11: Validation Edge Cases
  describe('11 -- Validation Edge Cases', () => {
    it('rejects null/undefined timeline entries over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        expect(validateTimelineEntry(null).valid).toBe(false);
        expect(validateTimelineEntry(undefined).valid).toBe(false);
        expect(validateTimelineEntry({}).valid).toBe(false);
        expect(validateTimelineEntry({ entryId: '' }).valid).toBe(false);
      }
    });

    it('rejects null/undefined checkpoints over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        expect(validateCheckpoint(null).valid).toBe(false);
        expect(validateCheckpoint(undefined).valid).toBe(false);
        expect(validateCheckpoint({}).valid).toBe(false);
        expect(validateCheckpoint({ checkpointId: '' }).valid).toBe(false);
      }
    });

    it('rejects null/undefined recovery entries over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        expect(validateRecoveryEntry(null).valid).toBe(false);
        expect(validateRecoveryEntry(undefined).valid).toBe(false);
        expect(validateRecoveryEntry({}).valid).toBe(false);
        expect(validateRecoveryEntry({ recoveryId: '' }).valid).toBe(false);
      }
    });

    it('handles update/remove on nonexistent keys gracefully', () => {
      const sync = new ProjectTimelineSynchronizer();
      for (let i = 0; i < 500; i++) {
        // None of these should throw
        sync.updateTimelineEntry(`nonexistent_${i}`, { description: 'x' });
        sync.updateCheckpoint(`nonexistent_${i}`, { name: 'x' });
        sync.updateRecoveryEntry(`nonexistent_${i}`, { label: 'x' });
        sync.removeTimelineEntry(`nonexistent_${i}`);
        sync.removeCheckpoint(`nonexistent_${i}`);
        sync.removeRecoveryEntry(`nonexistent_${i}`);
        expect(sync.getTimelineEntry(`nonexistent_${i}`)).toBeUndefined();
        expect(sync.getCheckpoint(`nonexistent_${i}`)).toBeUndefined();
        expect(sync.getRecoveryEntry(`nonexistent_${i}`)).toBeUndefined();
      }
    });

    it('handles register with empty IDs gracefully', () => {
      const sync = new ProjectTimelineSynchronizer();
      // These should warn and not add
      sync.registerTimelineEntry({ entryId: '' } as any);
      sync.registerCheckpoint({ checkpointId: '' } as any);
      sync.registerRecoveryEntry({ recoveryId: '' } as any);
      expect(sync.timelineSize).toBe(0);
      expect(sync.checkpointSize).toBe(0);
      expect(sync.recoverySize).toBe(0);
    });
  });

  // SECTION 12: Constants Verification
  describe('12 -- Constants Verification', () => {
    it('verifies VALID_TIMELINE_ACTIONS has 17 entries', () => {
      expect(VALID_TIMELINE_ACTIONS).toHaveLength(17);
      expect(VALID_TIMELINE_ACTIONS).toContain('component_added');
      expect(VALID_TIMELINE_ACTIONS).toContain('component_removed');
      expect(VALID_TIMELINE_ACTIONS).toContain('component_moved');
      expect(VALID_TIMELINE_ACTIONS).toContain('wire_created');
      expect(VALID_TIMELINE_ACTIONS).toContain('wire_deleted');
      expect(VALID_TIMELINE_ACTIONS).toContain('import_performed');
      expect(VALID_TIMELINE_ACTIONS).toContain('export_performed');
      expect(VALID_TIMELINE_ACTIONS).toContain('ai_auto_wiring');
      expect(VALID_TIMELINE_ACTIONS).toContain('blockly_changed');
      expect(VALID_TIMELINE_ACTIONS).toContain('project_restored');
      expect(VALID_TIMELINE_ACTIONS).toContain('checkpoint_created');
      expect(VALID_TIMELINE_ACTIONS).toContain('checkpoint_restored');
      expect(VALID_TIMELINE_ACTIONS).toContain('version_created');
      expect(VALID_TIMELINE_ACTIONS).toContain('project_saved');
      expect(VALID_TIMELINE_ACTIONS).toContain('project_loaded');
      expect(VALID_TIMELINE_ACTIONS).toContain('workspace_cleared');
      expect(VALID_TIMELINE_ACTIONS).toContain('manual_entry');
    });

    it('verifies VALID_RECOVERY_TYPES has 4 entries', () => {
      expect(VALID_RECOVERY_TYPES).toHaveLength(4);
      expect(VALID_RECOVERY_TYPES).toContain('project');
      expect(VALID_RECOVERY_TYPES).toContain('version');
      expect(VALID_RECOVERY_TYPES).toContain('checkpoint');
      expect(VALID_RECOVERY_TYPES).toContain('timeline_entry');
    });
  });
});
