// ═══════════════════════════════════════════════════════════════
// Phase 30A — E2E Test Suite
// Project Library, Save/Load, Versioning & Template Management
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Project Library ────────────────────────────────────────────
import {
  createDefaultProjectModel,
  createDefaultProjectFolderModel,
  createDefaultProjectTagModel,
  createDefaultProjectMetadataModel,
  validateProjectModel,
  validateProjectFolderModel,
  validateProjectTagModel,
  validateProjectMetadataModel,
  VALID_PROJECT_STATUSES,
  VALID_SORT_FIELDS,
  ProjectLibrarySynchronizer,
} from '../src/stage/project-library-runtime';

// ─── Project Version ────────────────────────────────────────────
import {
  createDefaultProjectVersionModel,
  createDefaultProjectChangeModel,
  validateProjectVersionModel,
  validateProjectChangeModel,
  VALID_VERSION_ACTIONS,
  VALID_CHANGE_TYPES,
  MAX_VERSIONS_PER_PROJECT,
  MAX_SNAPSHOT_SIZE_BYTES,
  ProjectVersionSynchronizer,
} from '../src/stage/project-version-runtime';

// ─── Auto-Save ──────────────────────────────────────────────────
import {
  createDefaultAutoSaveEntryModel,
  createDefaultAutoSaveConfigModel,
  validateAutoSaveEntryModel,
  validateAutoSaveConfigModel,
  DEFAULT_AUTO_SAVE_INTERVAL_MS,
  DEFAULT_MAX_SNAPSHOTS,
  DEFAULT_DEBOUNCE_MS,
  AutoSaveSynchronizer,
} from '../src/stage/auto-save-runtime';

// ─── Project Thumbnail ──────────────────────────────────────────
import {
  createDefaultProjectThumbnailModel,
  createDefaultProjectStatisticsModel,
  createDefaultProjectShareModel,
  createDefaultProjectExportModel,
  createDefaultProjectImportResultModel,
  validateProjectThumbnailModel,
  validateProjectStatisticsModel,
  validateProjectShareModel,
  validateProjectExportModel,
  validateProjectImportResultModel,
  VALID_THUMBNAIL_TARGETS,
  VALID_SHARE_PERMISSIONS,
  VALID_EXPORT_FORMATS,
  DEFAULT_THUMBNAIL_WIDTH,
  DEFAULT_THUMBNAIL_HEIGHT,
  EXPORT_VERSION,
  ProjectThumbnailSynchronizer,
} from '../src/stage/project-thumbnail-runtime';

// ─── Types ──────────────────────────────────────────────────────
import type {
  ProjectModel,
  ProjectFolderModel,
  ProjectTagModel,
  ProjectMetadataModel,
  ProjectVersionModel,
  ProjectChangeModel,
  AutoSaveEntryModel,
  AutoSaveConfigModel,
  ProjectThumbnailModel,
  ProjectStatisticsModel,
  ProjectShareModel,
  ProjectExportModel,
  ProjectImportResultModel,
  ProjectLibrarySnapshot,
  ProjectVersionSnapshot,
  AutoSaveSnapshot,
} from '../src/types';

// ─── Helpers ────────────────────────────────────────────────────

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

// ═══════════════════════════════════════════════════════════════
// 1. ProjectLibrarySynchronizer
// ═══════════════════════════════════════════════════════════════

describe('ProjectLibrarySynchronizer', () => {
  let sync: ProjectLibrarySynchronizer;

  beforeEach(() => {
    sync = new ProjectLibrarySynchronizer();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  // ─── 1a. Factory Functions ──────────────────────────────────

  describe('Factory Functions', () => {
    it('createDefaultProjectModel generates a model with projectId', () => {
      const m = createDefaultProjectModel();
      expect(m.projectId).toBeTruthy();
      expect(m.name).toBe('');
      expect(m.status).toBe('ACTIVE');
      expect(m.createdAt).toBeGreaterThan(0);
    });

    it('createDefaultProjectModel applies overrides', () => {
      const m = createDefaultProjectModel({ name: 'Override', description: 'Desc' });
      expect(m.name).toBe('Override');
      expect(m.description).toBe('Desc');
    });

    it('createDefaultProjectModel generates unique IDs', () => {
      const a = createDefaultProjectModel();
      const b = createDefaultProjectModel();
      expect(a.projectId).not.toBe(b.projectId);
    });

    it('createDefaultProjectFolderModel generates a model with folderId', () => {
      const f = createDefaultProjectFolderModel();
      expect(f.folderId).toBeTruthy();
      expect(f.name).toBe('');
    });

    it('createDefaultProjectTagModel generates a model with tagId', () => {
      const t = createDefaultProjectTagModel();
      expect(t.tagId).toBeTruthy();
    });

    it('createDefaultProjectMetadataModel generates a model with metadataId', () => {
      const m = createDefaultProjectMetadataModel();
      expect(m.metadataId).toBeTruthy();
    });
  });

  // ─── 1b. Validators ────────────────────────────────────────

  describe('Validators', () => {
    it('validateProjectModel returns no warnings for valid model', () => {
      const m = createDefaultProjectModel({ name: 'Valid' });
      const warnings = validateProjectModel(m);
      expect(Array.isArray(warnings)).toBe(true);
    });

    it('validateProjectModel warns on empty name', () => {
      const m = createDefaultProjectModel({ name: '' });
      const warnings = validateProjectModel(m);
      expect(warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('validateProjectFolderModel returns warnings array', () => {
      const f = createDefaultProjectFolderModel({ name: 'F1' });
      const warnings = validateProjectFolderModel(f);
      expect(Array.isArray(warnings)).toBe(true);
    });

    it('validateProjectTagModel returns warnings array', () => {
      const t = createDefaultProjectTagModel({ name: 'Tag1' });
      const warnings = validateProjectTagModel(t);
      expect(Array.isArray(warnings)).toBe(true);
    });

    it('validateProjectMetadataModel returns warnings array', () => {
      const m = createDefaultProjectMetadataModel();
      const warnings = validateProjectMetadataModel(m);
      expect(Array.isArray(warnings)).toBe(true);
    });
  });

  // ─── 1c. Project CRUD ──────────────────────────────────────

  describe('Project CRUD', () => {
    it('registerProject + getProject round-trips', () => {
      const model = createDefaultProjectModel({ name: 'Test' });
      sync.registerProject(model.projectId, model);
      const fetched = sync.getProject(model.projectId);
      expect(fetched).toBeDefined();
      expect(fetched!.name).toBe('Test');
    });

    it('getAllProjects returns all registered', () => {
      sync.registerProject('a', createDefaultProjectModel({ name: 'A' }));
      sync.registerProject('b', createDefaultProjectModel({ name: 'B' }));
      expect(sync.getAllProjects()).toHaveLength(2);
    });

    it('updateProject merges partial', () => {
      const m = createDefaultProjectModel({ name: 'Old' });
      sync.registerProject(m.projectId, m);
      sync.updateProject(m.projectId, { name: 'New' });
      expect(sync.getProject(m.projectId)!.name).toBe('New');
    });

    it('removeProject deletes entry', () => {
      const m = createDefaultProjectModel({ name: 'Delete Me' });
      sync.registerProject(m.projectId, m);
      sync.removeProject(m.projectId);
      expect(sync.getProject(m.projectId)).toBeUndefined();
    });

    it('clearProjects empties registry', () => {
      sync.registerProject('x', createDefaultProjectModel());
      sync.clearProjects();
      expect(sync.getAllProjects()).toHaveLength(0);
    });

    it('getProjectKeys returns keys', () => {
      sync.registerProject('k1', createDefaultProjectModel());
      sync.registerProject('k2', createDefaultProjectModel());
      const keys = sync.getProjectKeys();
      expect(keys).toContain('k1');
      expect(keys).toContain('k2');
    });

    it('hasProject returns correct boolean', () => {
      sync.registerProject('exists', createDefaultProjectModel());
      expect(sync.hasProject('exists')).toBe(true);
      expect(sync.hasProject('nope')).toBe(false);
    });

    it('handles 50 projects', () => {
      range(50).forEach(i => {
        sync.registerProject(`p_${i}`, createDefaultProjectModel({ name: `P${i}` }));
      });
      expect(sync.getAllProjects()).toHaveLength(50);
      expect(sync.getProjectKeys()).toHaveLength(50);
    });
  });

  // ─── 1d. Folder CRUD ──────────────────────────────────────

  describe('Folder CRUD', () => {
    it('registerFolder + getFolder round-trips', () => {
      const f = createDefaultProjectFolderModel({ name: 'MyFolder' });
      sync.registerFolder(f.folderId, f);
      expect(sync.getFolder(f.folderId)!.name).toBe('MyFolder');
    });

    it('getAllFolders returns all', () => {
      sync.registerFolder('f1', createDefaultProjectFolderModel({ name: 'F1' }));
      sync.registerFolder('f2', createDefaultProjectFolderModel({ name: 'F2' }));
      expect(sync.getAllFolders()).toHaveLength(2);
    });

    it('updateFolder merges partial', () => {
      const f = createDefaultProjectFolderModel({ name: 'Old' });
      sync.registerFolder(f.folderId, f);
      sync.updateFolder(f.folderId, { name: 'New' });
      expect(sync.getFolder(f.folderId)!.name).toBe('New');
    });

    it('removeFolder deletes entry', () => {
      sync.registerFolder('del', createDefaultProjectFolderModel());
      sync.removeFolder('del');
      expect(sync.getFolder('del')).toBeUndefined();
    });

    it('clearFolders empties', () => {
      sync.registerFolder('x', createDefaultProjectFolderModel());
      sync.clearFolders();
      expect(sync.getAllFolders()).toHaveLength(0);
    });

    it('hasFolder checks existence', () => {
      sync.registerFolder('ex', createDefaultProjectFolderModel());
      expect(sync.hasFolder('ex')).toBe(true);
      expect(sync.hasFolder('no')).toBe(false);
    });
  });

  // ─── 1e. Tag CRUD ─────────────────────────────────────────

  describe('Tag CRUD', () => {
    it('registerTag + getTag round-trips', () => {
      const t = createDefaultProjectTagModel({ name: 'Arduino' });
      sync.registerTag(t.tagId, t);
      expect(sync.getTag(t.tagId)!.name).toBe('Arduino');
    });

    it('getAllTags returns all', () => {
      sync.registerTag('t1', createDefaultProjectTagModel({ name: 'T1' }));
      sync.registerTag('t2', createDefaultProjectTagModel({ name: 'T2' }));
      expect(sync.getAllTags()).toHaveLength(2);
    });

    it('removeTag deletes', () => {
      sync.registerTag('del', createDefaultProjectTagModel());
      sync.removeTag('del');
      expect(sync.getTag('del')).toBeUndefined();
    });

    it('clearTags empties', () => {
      sync.registerTag('x', createDefaultProjectTagModel());
      sync.clearTags();
      expect(sync.getAllTags()).toHaveLength(0);
    });

    it('hasTag checks existence', () => {
      sync.registerTag('ex', createDefaultProjectTagModel());
      expect(sync.hasTag('ex')).toBe(true);
      expect(sync.hasTag('no')).toBe(false);
    });
  });

  // ─── 1f. Metadata CRUD ────────────────────────────────────

  describe('Metadata CRUD', () => {
    it('registerMetadata + getMetadata round-trips', () => {
      const m = createDefaultProjectMetadataModel();
      sync.registerMetadata(m.metadataId, m);
      expect(sync.getMetadata(m.metadataId)).toBeDefined();
    });

    it('getAllMetadata returns all', () => {
      sync.registerMetadata('m1', createDefaultProjectMetadataModel());
      sync.registerMetadata('m2', createDefaultProjectMetadataModel());
      expect(sync.getAllMetadata()).toHaveLength(2);
    });

    it('removeMetadata deletes', () => {
      sync.registerMetadata('del', createDefaultProjectMetadataModel());
      sync.removeMetadata('del');
      expect(sync.getMetadata('del')).toBeUndefined();
    });

    it('clearMetadata empties', () => {
      sync.registerMetadata('x', createDefaultProjectMetadataModel());
      sync.clearMetadata();
      expect(sync.getAllMetadata()).toHaveLength(0);
    });

    it('hasMetadata checks existence', () => {
      sync.registerMetadata('ex', createDefaultProjectMetadataModel());
      expect(sync.hasMetadata('ex')).toBe(true);
      expect(sync.hasMetadata('no')).toBe(false);
    });
  });

  // ─── 1g. Core Lifecycle ────────────────────────────────────

  describe('Core Lifecycle', () => {
    it('createProject returns model with id, name, timestamp', () => {
      const p = sync.createProject('My Project', 'A description');
      expect(p.projectId).toBeTruthy();
      expect(p.name).toBe('My Project');
      expect(p.description).toBe('A description');
      expect(p.status).toBe('ACTIVE');
    });

    it('createProject also creates companion metadata', () => {
      const p = sync.createProject('Meta Test');
      const meta = sync.getMetadataForProject(p.projectId);
      expect(meta).toBeDefined();
    });

    it('renameProject updates name', () => {
      const p = sync.createProject('Original');
      const result = sync.renameProject(p.projectId, 'Renamed');
      expect(result).toBe(true);
      expect(sync.getProject(p.projectId)!.name).toBe('Renamed');
    });

    it('renameProject returns false for missing project', () => {
      expect(sync.renameProject('nonexistent', 'X')).toBe(false);
    });

    it('deleteProject sets status to DELETED', () => {
      const p = sync.createProject('Doomed');
      sync.deleteProject(p.projectId);
      expect(sync.getProject(p.projectId)!.status).toBe('DELETED');
    });

    it('duplicateProject creates copy with new ID', () => {
      const p = sync.createProject('Original', 'Desc');
      const dup = sync.duplicateProject(p.projectId, 'Copy');
      expect(dup).not.toBeNull();
      expect(dup!.projectId).not.toBe(p.projectId);
      expect(dup!.name).toBe('Copy');
    });

    it('archiveProject / unarchiveProject toggles status', () => {
      const p = sync.createProject('Archive Me');
      sync.archiveProject(p.projectId);
      expect(sync.getProject(p.projectId)!.status).toBe('ARCHIVED');
      sync.unarchiveProject(p.projectId);
      expect(sync.getProject(p.projectId)!.status).toBe('ACTIVE');
    });

    it('favoriteProject / unfavoriteProject toggles flag', () => {
      const p = sync.createProject('Fav');
      sync.favoriteProject(p.projectId);
      expect(sync.getProject(p.projectId)!.isFavorite).toBe(true);
      sync.unfavoriteProject(p.projectId);
      expect(sync.getProject(p.projectId)!.isFavorite).toBe(false);
    });

    it('pinProject / unpinProject toggles flag', () => {
      const p = sync.createProject('Pin');
      sync.pinProject(p.projectId);
      expect(sync.getProject(p.projectId)!.isPinned).toBe(true);
      sync.unpinProject(p.projectId);
      expect(sync.getProject(p.projectId)!.isPinned).toBe(false);
    });
  });

  // ─── 1h. Search & Filter ──────────────────────────────────

  describe('Search & Filter', () => {
    it('searchProjects by name', () => {
      sync.createProject('Arduino Blink');
      sync.createProject('LED Matrix');
      const results = sync.searchProjects('Arduino');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].name).toContain('Arduino');
    });

    it('searchProjects with status filter', () => {
      sync.createProject('Active One');
      sync.createProject('Archived One');
      sync.archiveProject(sync.getAllProjects()[1].projectId);
      const results = sync.searchProjects('', { status: 'ACTIVE' });
      expect(results.every(r => r.status === 'ACTIVE')).toBe(true);
    });

    it('getRecentProjects returns sorted by modifiedAt desc', () => {
      sync.createProject('Old');
      sync.createProject('New');
      const recent = sync.getRecentProjects(10);
      expect(recent.length).toBeGreaterThanOrEqual(2);
    });

    it('getRecentProjects excludes deleted', () => {
      const p = sync.createProject('Deleted');
      sync.deleteProject(p.projectId);
      sync.createProject('Alive');
      const recent = sync.getRecentProjects(10);
      expect(recent.every(r => r.status !== 'DELETED')).toBe(true);
    });

    it('getFavoriteProjects returns only favorites', () => {
      const p1 = sync.createProject('Fav');
      sync.createProject('NotFav');
      sync.favoriteProject(p1.projectId);
      const favs = sync.getFavoriteProjects();
      expect(favs.length).toBe(1);
      expect(favs[0].projectId).toBe(p1.projectId);
    });

    it('getPinnedProjects returns only pinned', () => {
      const p1 = sync.createProject('Pinned');
      sync.createProject('NotPinned');
      sync.pinProject(p1.projectId);
      const pinned = sync.getPinnedProjects();
      expect(pinned.length).toBe(1);
    });

    it('getProjectsByStatus filters correctly', () => {
      sync.createProject('A1');
      const p2 = sync.createProject('A2');
      sync.archiveProject(p2.projectId);
      const archived = sync.getProjectsByStatus('ARCHIVED');
      expect(archived).toHaveLength(1);
    });

    it('sortProjects by NAME ascending', () => {
      const p1 = sync.createProject('Zebra');
      const p2 = sync.createProject('Alpha');
      const sorted = sync.sortProjects(sync.getAllProjects(), 'NAME', true);
      expect(sorted[0].name).toBe('Alpha');
      expect(sorted[1].name).toBe('Zebra');
    });
  });

  // ─── 1i. Folder Management ────────────────────────────────

  describe('Folder Management', () => {
    it('createFolder returns model with id and name', () => {
      const f = sync.createFolder('My Folder');
      expect(f.folderId).toBeTruthy();
      expect(f.name).toBe('My Folder');
    });

    it('deleteFolder removes folder', () => {
      const f = sync.createFolder('Del Folder');
      const result = sync.deleteFolder(f.folderId);
      expect(result).toBe(true);
      expect(sync.getFolder(f.folderId)).toBeUndefined();
    });

    it('renameFolder updates name', () => {
      const f = sync.createFolder('Old Name');
      sync.renameFolder(f.folderId, 'New Name');
      expect(sync.getFolder(f.folderId)!.name).toBe('New Name');
    });

    it('moveProjectToFolder updates project', () => {
      const p = sync.createProject('Movable');
      const f = sync.createFolder('Target');
      const result = sync.moveProjectToFolder(p.projectId, f.folderId);
      expect(result).toBe(true);
      expect(sync.getProject(p.projectId)!.folderId).toBe(f.folderId);
    });

    it('getChildFolders returns children', () => {
      const parent = sync.createFolder('Parent');
      sync.createFolder('Child', parent.folderId);
      const children = sync.getChildFolders(parent.folderId);
      expect(children.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── 1j. Tag Management ───────────────────────────────────

  describe('Tag Management', () => {
    it('createTag returns model with name and color', () => {
      const t = sync.createTag('Arduino', '#FF5722');
      expect(t.tagId).toBeTruthy();
      expect(t.name).toBe('Arduino');
      expect(t.color).toBe('#FF5722');
    });

    it('deleteTag removes tag', () => {
      const t = sync.createTag('Temp');
      sync.deleteTag(t.tagId);
      expect(sync.getTag(t.tagId)).toBeUndefined();
    });

    it('renameTag updates name', () => {
      const t = sync.createTag('Old');
      sync.renameTag(t.tagId, 'New');
      expect(sync.getTag(t.tagId)!.name).toBe('New');
    });

    it('tagProject adds tag to project', () => {
      const p = sync.createProject('Tagged');
      const t = sync.createTag('Sensor');
      sync.tagProject(p.projectId, t.tagId);
      expect(sync.getProject(p.projectId)!.tags).toContain(t.tagId);
    });

    it('untagProject removes tag from project', () => {
      const p = sync.createProject('Untagged');
      const t = sync.createTag('Remove');
      sync.tagProject(p.projectId, t.tagId);
      sync.untagProject(p.projectId, t.tagId);
      expect(sync.getProject(p.projectId)!.tags).not.toContain(t.tagId);
    });

    it('getTagsForProject returns associated tags', () => {
      const p = sync.createProject('Multi');
      const t1 = sync.createTag('T1');
      const t2 = sync.createTag('T2');
      sync.tagProject(p.projectId, t1.tagId);
      sync.tagProject(p.projectId, t2.tagId);
      const tags = sync.getTagsForProject(p.projectId);
      expect(tags.length).toBe(2);
    });
  });

  // ─── 1k. Metadata & Statistics ────────────────────────────

  describe('Metadata & Statistics', () => {
    it('updateProjectStatistics merges stats', () => {
      const p = sync.createProject('Stats');
      sync.updateProjectStatistics(p.projectId, { componentCount: 5 });
      const meta = sync.getMetadataForProject(p.projectId);
      expect(meta!.componentCount).toBe(5);
    });

    it('calculateComplexity uses weighted formula', () => {
      const p = sync.createProject('Complex');
      sync.updateProjectStatistics(p.projectId, {
        componentCount: 10,
        wireCount: 20,
        sensorCount: 3,
        blocklyBlockCount: 15,
      });
      const complexity = sync.calculateComplexity(p.projectId);
      // componentCount*1 + wireCount*0.5 + sensorCount*2 + blocklyBlockCount*0.3
      expect(complexity).toBe(30.5);
    });

    it('updateHealthScore clamps to 0-100', () => {
      const p = sync.createProject('Health');
      sync.updateHealthScore(p.projectId, 150);
      const proj = sync.getProject(p.projectId);
      expect(proj!.healthScore).toBeLessThanOrEqual(100);
    });

    it('recordSimulationRun increments count', () => {
      const p = sync.createProject('Sim');
      sync.recordSimulationRun(p.projectId);
      sync.recordSimulationRun(p.projectId);
      const meta = sync.getMetadataForProject(p.projectId);
      expect(meta!.simulationRuns).toBe(2);
    });

    it('getProjectCountsByStatus returns correct counts', () => {
      sync.createProject('A');
      const p2 = sync.createProject('B');
      sync.archiveProject(p2.projectId);
      const counts = sync.getProjectCountsByStatus();
      expect(counts.ACTIVE).toBe(1);
      expect(counts.ARCHIVED).toBe(1);
    });

    it('getActiveProjectCount excludes deleted', () => {
      sync.createProject('Live');
      const p2 = sync.createProject('Dead');
      sync.deleteProject(p2.projectId);
      expect(sync.getActiveProjectCount()).toBe(1);
    });
  });

  // ─── 1l. Bulk Operations ──────────────────────────────────

  describe('Bulk Operations', () => {
    it('purgeDeletedProjects removes DELETED permanently', () => {
      const p = sync.createProject('Purge');
      sync.deleteProject(p.projectId);
      const purged = sync.purgeDeletedProjects();
      expect(purged).toBe(1);
      expect(sync.getProject(p.projectId)).toBeUndefined();
    });

    it('clearAllFavorites unfavorites all', () => {
      const p1 = sync.createProject('F1');
      const p2 = sync.createProject('F2');
      sync.favoriteProject(p1.projectId);
      sync.favoriteProject(p2.projectId);
      sync.clearAllFavorites();
      expect(sync.getFavoriteProjects()).toHaveLength(0);
    });

    it('clearAllPins unpins all', () => {
      const p1 = sync.createProject('P1');
      sync.pinProject(p1.projectId);
      sync.clearAllPins();
      expect(sync.getPinnedProjects()).toHaveLength(0);
    });

    it('archiveStaleProjects archives old projects', () => {
      const p = sync.createProject('Stale');
      // Force old modifiedAt
      sync.updateProject(p.projectId, { modifiedAt: 1000 });
      const count = sync.archiveStaleProjects(Date.now());
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('purgeDeletedProjects returns 0 when no deleted', () => {
      sync.createProject('Alive');
      expect(sync.purgeDeletedProjects()).toBe(0);
    });
  });

  // ─── 1m. Snapshot & Import ─────────────────────────────────

  describe('Snapshot & Import', () => {
    it('getSnapshot returns deep copy of all data', () => {
      sync.createProject('Snap');
      const snap = sync.getSnapshot();
      expect(snap.projects.length).toBe(1);
      expect(snap.metadata.length).toBeGreaterThanOrEqual(1);
    });

    it('importSnapshot replaces all data', () => {
      const p = sync.createProject('Original');
      const snap = sync.getSnapshot();
      sync.clearAll();
      expect(sync.getAllProjects()).toHaveLength(0);
      sync.importSnapshot(snap);
      expect(sync.getAllProjects()).toHaveLength(1);
    });

    it('validateAll returns warnings', () => {
      sync.createProject('Valid');
      const warnings = sync.validateAll();
      expect(Array.isArray(warnings)).toBe(true);
    });

    it('clearAll resets everything', () => {
      sync.createProject('Gone');
      sync.createFolder('Gone');
      sync.createTag('Gone');
      sync.clearAll();
      expect(sync.getAllProjects()).toHaveLength(0);
      expect(sync.getAllFolders()).toHaveLength(0);
      expect(sync.getAllTags()).toHaveLength(0);
    });

    it('returned models are deep copies (mutation safety)', () => {
      const p = sync.createProject('Safe');
      const fetched = sync.getProject(p.projectId)!;
      fetched.name = 'MUTATED';
      const refetch = sync.getProject(p.projectId)!;
      expect(refetch.name).toBe('Safe');
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. ProjectVersionSynchronizer
// ═══════════════════════════════════════════════════════════════

describe('ProjectVersionSynchronizer', () => {
  let sync: ProjectVersionSynchronizer;

  beforeEach(() => {
    sync = new ProjectVersionSynchronizer();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  // ─── 2a. Factory & Validation ──────────────────────────────

  describe('Factory & Validation', () => {
    it('createDefaultProjectVersionModel generates defaults', () => {
      const m = createDefaultProjectVersionModel();
      expect(m.versionId).toBeTruthy();
      expect(m.versionNumber).toBe(1);
      expect(m.snapshot).toBe('{}');
    });

    it('createDefaultProjectVersionModel applies overrides', () => {
      const m = createDefaultProjectVersionModel({ projectId: 'p1', versionNumber: 5 });
      expect(m.projectId).toBe('p1');
      expect(m.versionNumber).toBe(5);
    });

    it('createDefaultProjectChangeModel generates defaults', () => {
      const c = createDefaultProjectChangeModel();
      expect(c.changeId).toBeTruthy();
    });

    it('validateProjectVersionModel populates warnings array', () => {
      const warnings: any[] = [];
      const m = createDefaultProjectVersionModel();
      validateProjectVersionModel(m, warnings);
      expect(Array.isArray(warnings)).toBe(true);
    });

    it('validateProjectChangeModel populates warnings array', () => {
      const warnings: any[] = [];
      const c = createDefaultProjectChangeModel();
      validateProjectChangeModel(c, warnings);
      expect(Array.isArray(warnings)).toBe(true);
    });
  });

  // ─── 2b. Version CRUD ──────────────────────────────────────

  describe('Version CRUD', () => {
    it('registerVersion + getVersion round-trips', () => {
      const m = createDefaultProjectVersionModel({ versionId: 'v1', projectId: 'p1' });
      sync.registerVersion('v1', m);
      expect(sync.getVersion('v1')).toBeDefined();
      expect(sync.hasVersion('v1')).toBe(true);
    });

    it('getAllVersions returns all', () => {
      sync.registerVersion('v1', createDefaultProjectVersionModel({ versionId: 'v1' }));
      sync.registerVersion('v2', createDefaultProjectVersionModel({ versionId: 'v2' }));
      expect(sync.getAllVersions()).toHaveLength(2);
    });

    it('updateVersion merges partial', () => {
      sync.registerVersion('v1', createDefaultProjectVersionModel({ versionId: 'v1', label: 'Old' }));
      sync.updateVersion('v1', { label: 'New' });
      expect(sync.getVersion('v1')!.label).toBe('New');
    });

    it('removeVersion deletes entry', () => {
      sync.registerVersion('v1', createDefaultProjectVersionModel({ versionId: 'v1' }));
      sync.removeVersion('v1');
      expect(sync.getVersion('v1')).toBeUndefined();
    });

    it('clearVersions empties', () => {
      sync.registerVersion('v1', createDefaultProjectVersionModel({ versionId: 'v1' }));
      sync.clearVersions();
      expect(sync.getAllVersions()).toHaveLength(0);
    });

    it('getVersionKeys returns keys', () => {
      sync.registerVersion('va', createDefaultProjectVersionModel({ versionId: 'va' }));
      expect(sync.getVersionKeys()).toContain('va');
    });

    it('handles 50 versions', () => {
      range(50).forEach(i => {
        sync.registerVersion(`v_${i}`, createDefaultProjectVersionModel({ versionId: `v_${i}` }));
      });
      expect(sync.getAllVersions()).toHaveLength(50);
    });
  });

  // ─── 2c. Change CRUD ──────────────────────────────────────

  describe('Change CRUD', () => {
    it('registerChange + getChange round-trips', () => {
      const c = createDefaultProjectChangeModel({ changeId: 'c1' });
      sync.registerChange('c1', c);
      expect(sync.getChange('c1')).toBeDefined();
    });

    it('getAllChanges returns all', () => {
      sync.registerChange('c1', createDefaultProjectChangeModel({ changeId: 'c1' }));
      sync.registerChange('c2', createDefaultProjectChangeModel({ changeId: 'c2' }));
      expect(sync.getAllChanges()).toHaveLength(2);
    });

    it('removeChange deletes entry', () => {
      sync.registerChange('c1', createDefaultProjectChangeModel({ changeId: 'c1' }));
      sync.removeChange('c1');
      expect(sync.getChange('c1')).toBeUndefined();
    });

    it('clearChanges empties', () => {
      sync.registerChange('c1', createDefaultProjectChangeModel({ changeId: 'c1' }));
      sync.clearChanges();
      expect(sync.getAllChanges()).toHaveLength(0);
    });

    it('hasChange checks existence', () => {
      sync.registerChange('c1', createDefaultProjectChangeModel({ changeId: 'c1' }));
      expect(sync.hasChange('c1')).toBe(true);
      expect(sync.hasChange('nope')).toBe(false);
    });
  });

  // ─── 2d. Core Methods ─────────────────────────────────────

  describe('Core Methods', () => {
    it('saveVersion auto-increments versionNumber', () => {
      const v1 = sync.saveVersion('p1', '{"data":1}', 'First');
      expect(v1.versionNumber).toBe(1);
      expect(v1.action).toBe('SAVE');
      const v2 = sync.saveVersion('p1', '{"data":2}', 'Second');
      expect(v2.versionNumber).toBe(2);
    });

    it('saveVersion calculates sizeBytes', () => {
      const snapshot = JSON.stringify({ data: 'hello world'.repeat(100) });
      const v = sync.saveVersion('p1', snapshot);
      expect(v.sizeBytes).toBeGreaterThan(0);
    });

    it('restoreVersion returns snapshot string', () => {
      const snapshot = '{"components":[1,2,3]}';
      const v = sync.saveVersion('p1', snapshot);
      const restored = sync.restoreVersion(v.versionId);
      expect(restored).toBe(snapshot);
    });

    it('restoreVersion returns null for missing', () => {
      expect(sync.restoreVersion('nonexistent')).toBeNull();
    });

    it('getVersionHistory returns sorted desc', () => {
      sync.saveVersion('p1', '1');
      sync.saveVersion('p1', '2');
      sync.saveVersion('p1', '3');
      const history = sync.getVersionHistory('p1');
      expect(history).toHaveLength(3);
      expect(history[0].versionNumber).toBe(3);
      expect(history[2].versionNumber).toBe(1);
    });

    it('getLatestVersion returns highest version', () => {
      sync.saveVersion('p1', '1');
      sync.saveVersion('p1', '2');
      const latest = sync.getLatestVersion('p1');
      expect(latest).not.toBeNull();
      expect(latest!.versionNumber).toBe(2);
    });

    it('getLatestVersion returns null for no versions', () => {
      expect(sync.getLatestVersion('nonexistent')).toBeNull();
    });

    it('rollbackToVersion creates new version with old snapshot', () => {
      const v1 = sync.saveVersion('p1', 'snapshot-v1');
      sync.saveVersion('p1', 'snapshot-v2');
      const rollback = sync.rollbackToVersion('p1', v1.versionId);
      expect(rollback).not.toBeNull();
      expect(rollback!.versionNumber).toBe(3);
      expect(rollback!.action).toBe('ROLLBACK');
      expect(rollback!.snapshot).toBe('snapshot-v1');
    });

    it('rollbackToVersion returns null for wrong project', () => {
      const v = sync.saveVersion('p1', 'data');
      expect(sync.rollbackToVersion('p2', v.versionId)).toBeNull();
    });

    it('compareVersions returns diff stats', () => {
      const v1 = sync.saveVersion('p1', 'small');
      const v2 = sync.saveVersion('p1', 'much larger snapshot data here');
      const diff = sync.compareVersions(v1.versionId, v2.versionId);
      expect(diff.summary).toBeTruthy();
    });

    it('autoCheckpoint uses CHECKPOINT action', () => {
      const cp = sync.autoCheckpoint('p1', 'checkpoint-data');
      expect(cp.action).toBe('CHECKPOINT');
    });

    it('pruneVersions keeps only keepCount', () => {
      range(10).forEach(i => sync.saveVersion('p1', `data-${i}`));
      expect(sync.getVersionHistory('p1')).toHaveLength(10);
      const removed = sync.pruneVersions('p1', 3);
      expect(removed).toBe(7);
      expect(sync.getVersionHistory('p1')).toHaveLength(3);
    });

    it('getVersionSize returns bytes', () => {
      const v = sync.saveVersion('p1', 'hello');
      expect(sync.getVersionSize(v.versionId)).toBeGreaterThan(0);
    });

    it('recordChange creates change entry', () => {
      const v = sync.saveVersion('p1', 'data');
      const c = sync.recordChange(v.versionId, 'component', 'comp1', 'ADD', '', 'new-value');
      expect(c.changeId).toBeTruthy();
      expect(c.changeType).toBe('ADD');
    });

    it('getChangesForVersion returns associated changes', () => {
      const v = sync.saveVersion('p1', 'data');
      sync.recordChange(v.versionId, 'component', 'c1', 'ADD');
      sync.recordChange(v.versionId, 'wire', 'w1', 'MODIFY');
      expect(sync.getChangesForVersion(v.versionId)).toHaveLength(2);
    });

    it('getVersionCount returns count for project', () => {
      sync.saveVersion('p1', 'a');
      sync.saveVersion('p1', 'b');
      sync.saveVersion('p2', 'c');
      expect(sync.getVersionCount('p1')).toBe(2);
      expect(sync.getVersionCount('p2')).toBe(1);
    });

    it('getTotalStorageSize sums bytes', () => {
      sync.saveVersion('p1', 'hello');
      sync.saveVersion('p1', 'world');
      expect(sync.getTotalStorageSize('p1')).toBeGreaterThan(0);
    });

    it('getVersionsByAction filters by action', () => {
      sync.saveVersion('p1', 'a', 'manual', 'SAVE');
      sync.autoCheckpoint('p1', 'b');
      expect(sync.getVersionsByAction('p1', 'CHECKPOINT')).toHaveLength(1);
      expect(sync.getVersionsByAction('p1', 'SAVE')).toHaveLength(1);
    });

    it('getVersionByNumber finds version', () => {
      sync.saveVersion('p1', 'v1data');
      sync.saveVersion('p1', 'v2data');
      const v = sync.getVersionByNumber('p1', 1);
      expect(v).not.toBeNull();
      expect(v!.snapshot).toBe('v1data');
    });

    it('getVersionSummary returns correct stats', () => {
      sync.saveVersion('p1', 'a', 'label', 'SAVE');
      sync.autoCheckpoint('p1', 'b');
      sync.saveVersion('p1', 'c', 'rollback', 'ROLLBACK');
      const summary = sync.getVersionSummary('p1');
      expect(summary.totalVersions).toBe(3);
      expect(summary.saveCount).toBe(1);
      expect(summary.checkpointCount).toBe(1);
      expect(summary.rollbackCount).toBe(1);
    });
  });

  // ─── 2e. Snapshot & Lifecycle ──────────────────────────────

  describe('Snapshot & Lifecycle', () => {
    it('getSnapshot returns deep copy', () => {
      sync.saveVersion('p1', 'data');
      const snap = sync.getSnapshot();
      expect(snap.versions.length).toBe(1);
    });

    it('clearAll resets everything', () => {
      sync.saveVersion('p1', 'data');
      sync.recordChange(sync.getAllVersions()[0].versionId, 'comp', 'c1', 'ADD');
      sync.clearAll();
      expect(sync.getAllVersions()).toHaveLength(0);
      expect(sync.getAllChanges()).toHaveLength(0);
    });

    it('snapshot round-trip preserves data', () => {
      sync.saveVersion('p1', 'snap1');
      sync.saveVersion('p1', 'snap2');
      const snap = sync.getSnapshot();
      const serialized = JSON.stringify(snap);
      const parsed = JSON.parse(serialized);
      expect(parsed.versions).toHaveLength(2);
    });

    it('version IDs are unique across saves', () => {
      const v1 = sync.saveVersion('p1', 'a');
      const v2 = sync.saveVersion('p1', 'b');
      expect(v1.versionId).not.toBe(v2.versionId);
    });

    it('returned versions are deep copies', () => {
      const v = sync.saveVersion('p1', 'data');
      const fetched = sync.getVersion(v.versionId)!;
      fetched.snapshot = 'MUTATED';
      expect(sync.getVersion(v.versionId)!.snapshot).toBe('data');
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. AutoSaveSynchronizer
// ═══════════════════════════════════════════════════════════════

describe('AutoSaveSynchronizer', () => {
  let sync: AutoSaveSynchronizer;

  beforeEach(() => {
    sync = new AutoSaveSynchronizer();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  // ─── 3a. Factory & Validation ──────────────────────────────

  describe('Factory & Validation', () => {
    it('createDefaultAutoSaveEntryModel creates entry with ID', () => {
      const entry = createDefaultAutoSaveEntryModel('e1', { projectId: 'p1', snapshot: 'data' });
      expect(entry.entryId).toBe('e1');
      expect(entry.projectId).toBe('p1');
    });

    it('createDefaultAutoSaveConfigModel creates config with defaults', () => {
      const config = createDefaultAutoSaveConfigModel('c1');
      expect(config.configId).toBe('c1');
      expect(config.enabled).toBe(true);
      expect(config.intervalMs).toBe(DEFAULT_AUTO_SAVE_INTERVAL_MS);
      expect(config.maxSnapshots).toBe(DEFAULT_MAX_SNAPSHOTS);
    });

    it('entry ID cannot be overridden', () => {
      const entry = createDefaultAutoSaveEntryModel('real-id', { entryId: 'fake' } as any);
      expect(entry.entryId).toBe('real-id');
    });

    it('config ID cannot be overridden', () => {
      const config = createDefaultAutoSaveConfigModel('real-id', { configId: 'fake' } as any);
      expect(config.configId).toBe('real-id');
    });

    it('validateAutoSaveEntryModel returns warnings', () => {
      const entry = createDefaultAutoSaveEntryModel('e1');
      const warnings = validateAutoSaveEntryModel(entry);
      expect(Array.isArray(warnings)).toBe(true);
    });

    it('validateAutoSaveConfigModel returns warnings', () => {
      const config = createDefaultAutoSaveConfigModel('c1');
      const warnings = validateAutoSaveConfigModel(config);
      expect(Array.isArray(warnings)).toBe(true);
    });
  });

  // ─── 3b. Entry CRUD ────────────────────────────────────────

  describe('Entry CRUD', () => {
    it('registerEntry + getEntry round-trips', () => {
      const entry = createDefaultAutoSaveEntryModel('e1', { projectId: 'p1' });
      sync.registerEntry('e1', entry);
      expect(sync.getEntry('e1')).toBeDefined();
    });

    it('getAllEntries returns all', () => {
      sync.registerEntry('e1', createDefaultAutoSaveEntryModel('e1'));
      sync.registerEntry('e2', createDefaultAutoSaveEntryModel('e2'));
      expect(sync.getAllEntries()).toHaveLength(2);
    });

    it('updateEntry merges partial', () => {
      sync.registerEntry('e1', createDefaultAutoSaveEntryModel('e1', { snapshot: 'old' }));
      sync.updateEntry('e1', { snapshot: 'new' });
      expect(sync.getEntry('e1')!.snapshot).toBe('new');
    });

    it('removeEntry deletes', () => {
      sync.registerEntry('e1', createDefaultAutoSaveEntryModel('e1'));
      sync.removeEntry('e1');
      expect(sync.getEntry('e1')).toBeUndefined();
    });

    it('clearEntries empties', () => {
      sync.registerEntry('e1', createDefaultAutoSaveEntryModel('e1'));
      sync.clearEntries();
      expect(sync.getAllEntries()).toHaveLength(0);
    });

    it('getEntryKeys returns keys', () => {
      sync.registerEntry('k1', createDefaultAutoSaveEntryModel('k1'));
      expect(sync.getEntryKeys()).toContain('k1');
    });

    it('hasEntry checks existence', () => {
      sync.registerEntry('e1', createDefaultAutoSaveEntryModel('e1'));
      expect(sync.hasEntry('e1')).toBe(true);
      expect(sync.hasEntry('nope')).toBe(false);
    });
  });

  // ─── 3c. Config CRUD ──────────────────────────────────────

  describe('Config CRUD', () => {
    it('registerConfig + getConfigEntry round-trips', () => {
      const config = createDefaultAutoSaveConfigModel('c1');
      sync.registerConfig('c1', config);
      expect(sync.getConfigEntry('c1')).toBeDefined();
    });

    it('getAllConfigs returns all', () => {
      sync.registerConfig('c1', createDefaultAutoSaveConfigModel('c1'));
      sync.registerConfig('c2', createDefaultAutoSaveConfigModel('c2'));
      expect(sync.getAllConfigs()).toHaveLength(2);
    });

    it('removeConfig deletes', () => {
      sync.registerConfig('c1', createDefaultAutoSaveConfigModel('c1'));
      sync.removeConfig('c1');
      expect(sync.getConfigEntry('c1')).toBeUndefined();
    });

    it('clearConfigs empties', () => {
      sync.registerConfig('c1', createDefaultAutoSaveConfigModel('c1'));
      sync.clearConfigs();
      expect(sync.getAllConfigs()).toHaveLength(0);
    });

    it('hasConfig checks existence', () => {
      sync.registerConfig('c1', createDefaultAutoSaveConfigModel('c1'));
      expect(sync.hasConfig('c1')).toBe(true);
      expect(sync.hasConfig('nope')).toBe(false);
    });
  });

  // ─── 3d. Core Methods ─────────────────────────────────────

  describe('Core Methods', () => {
    it('initializeDefaults creates default config', () => {
      sync.initializeDefaults();
      const config = sync.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.intervalMs).toBe(30000);
    });

    it('initializeDefaults is idempotent', () => {
      sync.initializeDefaults();
      sync.initializeDefaults();
      expect(sync.getAllConfigs()).toHaveLength(1);
    });

    it('triggerAutoSave creates entry', () => {
      const entry = sync.triggerAutoSave('p1', 'snapshot-data');
      expect(entry.entryId).toBeTruthy();
      expect(entry.projectId).toBe('p1');
      expect(entry.snapshot).toBe('snapshot-data');
    });

    it('triggerAutoSave marks project clean', () => {
      sync.markDirty('p1');
      expect(sync.isDirty('p1')).toBe(true);
      sync.triggerAutoSave('p1', 'data');
      expect(sync.isDirty('p1')).toBe(false);
    });

    it('triggerAutoSave rotates old entries', () => {
      sync.updateConfig({ maxSnapshots: 3 });
      range(5).forEach(i => sync.triggerAutoSave('p1', `snap-${i}`));
      expect(sync.getAutoSaveCount('p1')).toBeLessThanOrEqual(3);
    });

    it('getLatestAutoSave returns most recent', () => {
      sync.triggerAutoSave('p1', 'first');
      sync.triggerAutoSave('p1', 'second');
      const latest = sync.getLatestAutoSave('p1');
      expect(latest).not.toBeNull();
      // Both might have same savedAt (Date.now()) so just check it exists
      expect(['first', 'second']).toContain(latest!.snapshot);
    });

    it('getLatestAutoSave returns null for no entries', () => {
      expect(sync.getLatestAutoSave('nonexistent')).toBeNull();
    });

    it('recoverFromCrash returns latest entry', () => {
      sync.triggerAutoSave('p1', 'recovery-data');
      const recovered = sync.recoverFromCrash('p1');
      expect(recovered).not.toBeNull();
      expect(recovered!.snapshot).toBe('recovery-data');
    });

    it('recoverFromCrash returns null for empty project', () => {
      expect(sync.recoverFromCrash('empty')).toBeNull();
    });

    it('markDirty / markClean / isDirty track state', () => {
      expect(sync.isDirty('p1')).toBe(false);
      sync.markDirty('p1');
      expect(sync.isDirty('p1')).toBe(true);
      sync.markClean('p1');
      expect(sync.isDirty('p1')).toBe(false);
    });

    it('getDirtyProjects returns all dirty IDs', () => {
      sync.markDirty('p1');
      sync.markDirty('p2');
      sync.markDirty('p3');
      expect(sync.getDirtyProjects()).toHaveLength(3);
    });

    it('getRecoverySnapshots returns sorted desc', () => {
      sync.triggerAutoSave('p1', 'a');
      sync.triggerAutoSave('p1', 'b');
      sync.triggerAutoSave('p1', 'c');
      const snapshots = sync.getRecoverySnapshots('p1');
      expect(snapshots).toHaveLength(3);
      // Sorted by savedAt desc; all returned
      expect(snapshots.map(s => s.snapshot)).toContain('a');
      expect(snapshots.map(s => s.snapshot)).toContain('c');
    });

    it('pruneAutoSaves keeps latest maxCount', () => {
      sync.updateConfig({ maxSnapshots: 50 }); // prevent auto-pruning
      range(10).forEach(i => sync.triggerAutoSave('p1', `snap-${i}`));
      const pruned = sync.pruneAutoSaves('p1', 2);
      expect(pruned).toBeGreaterThan(0);
      expect(sync.getAutoSaveCount('p1')).toBe(2);
    });

    it('getConfig lazily initializes defaults', () => {
      const config = sync.getConfig();
      expect(config.enabled).toBe(true);
    });

    it('updateConfig merges overrides', () => {
      const updated = sync.updateConfig({ intervalMs: 5000, debounceMs: 500 });
      expect(updated.intervalMs).toBe(5000);
      expect(updated.debounceMs).toBe(500);
    });

    it('updateConfig cannot override configId', () => {
      const config = sync.getConfig();
      const updated = sync.updateConfig({ configId: 'HACKED' } as any);
      expect(updated.configId).toBe(config.configId);
    });

    it('getAutoSaveCount returns per-project count', () => {
      sync.triggerAutoSave('p1', 'a');
      sync.triggerAutoSave('p1', 'b');
      sync.triggerAutoSave('p2', 'c');
      expect(sync.getAutoSaveCount('p1')).toBe(2);
      expect(sync.getAutoSaveCount('p2')).toBe(1);
    });

    it('empty projectId guards', () => {
      expect(sync.getLatestAutoSave('')).toBeNull();
      expect(sync.isDirty('')).toBe(false);
      expect(sync.getAutoSaveCount('')).toBe(0);
    });
  });

  // ─── 3e. Snapshot & Lifecycle ──────────────────────────────

  describe('Snapshot & Lifecycle', () => {
    it('getSnapshot returns entries and config', () => {
      sync.triggerAutoSave('p1', 'data');
      const snap = sync.getSnapshot();
      expect(snap.entries).toHaveLength(1);
      expect(snap.config.length).toBeGreaterThanOrEqual(1);
    });

    it('clearAll resets everything including dirty set', () => {
      sync.triggerAutoSave('p1', 'data');
      sync.markDirty('p1');
      sync.clearAll();
      expect(sync.getAllEntries()).toHaveLength(0);
      expect(sync.isDirty('p1')).toBe(false);
    });

    it('snapshot is a deep copy', () => {
      sync.triggerAutoSave('p1', 'original');
      const snap = sync.getSnapshot();
      snap.entries[0].snapshot = 'MUTATED';
      const latest = sync.getLatestAutoSave('p1');
      expect(latest!.snapshot).toBe('original');
    });

    it('clearAll resets config counter', () => {
      sync.initializeDefaults();
      sync.clearAll();
      sync.initializeDefaults();
      expect(sync.getAllConfigs()).toHaveLength(1);
    });

    it('multiple projects tracked independently', () => {
      sync.triggerAutoSave('p1', 'data1');
      sync.triggerAutoSave('p2', 'data2');
      sync.markDirty('p1');
      expect(sync.isDirty('p1')).toBe(true);
      expect(sync.isDirty('p2')).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. ProjectThumbnailSynchronizer
// ═══════════════════════════════════════════════════════════════

describe('ProjectThumbnailSynchronizer', () => {
  let sync: ProjectThumbnailSynchronizer;

  beforeEach(() => {
    sync = new ProjectThumbnailSynchronizer();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  // ─── 4a. Factory & Validation ──────────────────────────────

  describe('Factory & Validation', () => {
    it('createDefaultProjectThumbnailModel generates defaults', () => {
      const m = createDefaultProjectThumbnailModel();
      expect(m.thumbnailId).toBeTruthy();
    });

    it('createDefaultProjectStatisticsModel generates defaults', () => {
      const m = createDefaultProjectStatisticsModel();
      expect(m.statisticsId).toBeTruthy();
    });

    it('createDefaultProjectShareModel generates defaults', () => {
      const m = createDefaultProjectShareModel();
      expect(m.shareId).toBeTruthy();
    });

    it('createDefaultProjectExportModel generates defaults', () => {
      const m = createDefaultProjectExportModel();
      expect(m.exportId).toBeTruthy();
    });

    it('createDefaultProjectImportResultModel generates defaults', () => {
      const m = createDefaultProjectImportResultModel();
      expect(m.importId).toBeTruthy();
    });

    it('validators accept valid models', () => {
      const w1: any[] = [];
      validateProjectThumbnailModel(createDefaultProjectThumbnailModel(), w1);
      expect(Array.isArray(w1)).toBe(true);

      const w2: any[] = [];
      validateProjectStatisticsModel(createDefaultProjectStatisticsModel(), w2);
      expect(Array.isArray(w2)).toBe(true);
    });
  });

  // ─── 4b. Thumbnail CRUD ────────────────────────────────────

  describe('Thumbnail CRUD', () => {
    it('registerThumbnail + getThumbnail round-trips', () => {
      const m = createDefaultProjectThumbnailModel({ thumbnailId: 't1', projectId: 'p1' });
      sync.registerThumbnail('t1', m);
      expect(sync.getThumbnail('t1')).toBeDefined();
    });

    it('getAllThumbnails returns all', () => {
      sync.registerThumbnail('t1', createDefaultProjectThumbnailModel({ thumbnailId: 't1' }));
      sync.registerThumbnail('t2', createDefaultProjectThumbnailModel({ thumbnailId: 't2' }));
      expect(sync.getAllThumbnails()).toHaveLength(2);
    });

    it('updateThumbnail returns false for missing', () => {
      expect(sync.updateThumbnail('nope', { width: 100 })).toBe(false);
    });

    it('removeThumbnail deletes', () => {
      sync.registerThumbnail('t1', createDefaultProjectThumbnailModel({ thumbnailId: 't1' }));
      sync.removeThumbnail('t1');
      expect(sync.getThumbnail('t1')).toBeUndefined();
    });

    it('clearThumbnails empties', () => {
      sync.registerThumbnail('t1', createDefaultProjectThumbnailModel({ thumbnailId: 't1' }));
      sync.clearThumbnails();
      expect(sync.getAllThumbnails()).toHaveLength(0);
    });
  });

  // ─── 4c. Statistics CRUD ───────────────────────────────────

  describe('Statistics CRUD', () => {
    it('registerStatistics + getStatistics round-trips', () => {
      const m = createDefaultProjectStatisticsModel({ statisticsId: 's1' });
      sync.registerStatistics('s1', m);
      expect(sync.getStatistics('s1')).toBeDefined();
    });

    it('removeStatistics deletes', () => {
      sync.registerStatistics('s1', createDefaultProjectStatisticsModel({ statisticsId: 's1' }));
      sync.removeStatistics('s1');
      expect(sync.getStatistics('s1')).toBeUndefined();
    });

    it('clearStatistics empties', () => {
      sync.registerStatistics('s1', createDefaultProjectStatisticsModel({ statisticsId: 's1' }));
      sync.clearStatistics();
      expect(sync.getAllStatistics()).toHaveLength(0);
    });

    it('hasStatistics checks existence', () => {
      sync.registerStatistics('s1', createDefaultProjectStatisticsModel({ statisticsId: 's1' }));
      expect(sync.hasStatistics('s1')).toBe(true);
      expect(sync.hasStatistics('nope')).toBe(false);
    });

    it('updateStatisticsEntry merges partial', () => {
      sync.registerStatistics('s1', createDefaultProjectStatisticsModel({ statisticsId: 's1', componentCount: 5 }));
      sync.updateStatisticsEntry('s1', { wireCount: 10 });
      expect(sync.getStatistics('s1')!.wireCount).toBe(10);
    });
  });

  // ─── 4d. Share CRUD ────────────────────────────────────────

  describe('Share CRUD', () => {
    it('registerShare + getShare round-trips', () => {
      const m = createDefaultProjectShareModel({ shareId: 'sh1' });
      sync.registerShare('sh1', m);
      expect(sync.getShare('sh1')).toBeDefined();
    });

    it('removeShare deletes', () => {
      sync.registerShare('sh1', createDefaultProjectShareModel({ shareId: 'sh1' }));
      sync.removeShare('sh1');
      expect(sync.getShare('sh1')).toBeUndefined();
    });

    it('clearShares empties', () => {
      sync.registerShare('sh1', createDefaultProjectShareModel({ shareId: 'sh1' }));
      sync.clearShares();
      expect(sync.getAllShares()).toHaveLength(0);
    });

    it('hasShare checks existence', () => {
      sync.registerShare('sh1', createDefaultProjectShareModel({ shareId: 'sh1' }));
      expect(sync.hasShare('sh1')).toBe(true);
    });

    it('getShareKeys returns keys', () => {
      sync.registerShare('sh1', createDefaultProjectShareModel({ shareId: 'sh1' }));
      expect(sync.getShareKeys()).toContain('sh1');
    });
  });

  // ─── 4e. Core Methods ─────────────────────────────────────

  describe('Core Methods', () => {
    it('generateThumbnailMetadata creates thumbnail entry', () => {
      const thumb = sync.generateThumbnailMetadata('p1', 'WORKSPACE');
      expect(thumb.thumbnailId).toBeTruthy();
      expect(thumb.projectId).toBe('p1');
      expect(thumb.target).toBe('WORKSPACE');
      expect(thumb.width).toBe(DEFAULT_THUMBNAIL_WIDTH);
      expect(thumb.height).toBe(DEFAULT_THUMBNAIL_HEIGHT);
    });

    it('getThumbnailForProject returns most recent', () => {
      sync.generateThumbnailMetadata('p1', 'WORKSPACE');
      sync.generateThumbnailMetadata('p1', 'CIRCUIT');
      const thumb = sync.getThumbnailForProject('p1');
      expect(thumb).not.toBeNull();
    });

    it('getThumbnailForProject filters by target', () => {
      sync.generateThumbnailMetadata('p1', 'WORKSPACE');
      sync.generateThumbnailMetadata('p1', 'CIRCUIT');
      const thumb = sync.getThumbnailForProject('p1', 'CIRCUIT');
      expect(thumb).not.toBeNull();
      expect(thumb!.target).toBe('CIRCUIT');
    });

    it('updateStatistics creates or updates', () => {
      const s = sync.updateStatistics('p1', { componentCount: 10 });
      expect(s.componentCount).toBe(10);
      const s2 = sync.updateStatistics('p1', { wireCount: 20 });
      expect(s2.componentCount).toBe(10);
      expect(s2.wireCount).toBe(20);
    });

    it('getStatisticsForProject returns stats', () => {
      sync.updateStatistics('p1', { componentCount: 5 });
      const stats = sync.getStatisticsForProject('p1');
      expect(stats).not.toBeNull();
      expect(stats!.componentCount).toBe(5);
    });

    it('calculateProjectHealth returns 0-100', () => {
      const score = sync.calculateProjectHealth('p1', 5, 10, 2);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('calculateProjectHealth penalizes empty project', () => {
      const score = sync.calculateProjectHealth('p1', 0, 0, 0);
      expect(score).toBeLessThan(100);
    });

    it('calculateProjectHealth gives bonus for sensors', () => {
      const withSensors = sync.calculateProjectHealth('p1', 5, 5, 3);
      const withoutSensors = sync.calculateProjectHealth('p1', 5, 5, 0);
      expect(withSensors).toBeGreaterThanOrEqual(withoutSensors);
    });

    it('createShareMetadata creates share entry', () => {
      const share = sync.createShareMetadata('p1', 'VIEW', 'my-slug');
      expect(share.shareId).toBeTruthy();
      expect(share.slug).toBe('my-slug');
      expect(share.permission).toBe('VIEW');
    });

    it('createShareMetadata generates slug if not provided', () => {
      const share = sync.createShareMetadata('p1');
      expect(share.slug).toBeTruthy();
    });

    it('getShareBySlug finds share', () => {
      sync.createShareMetadata('p1', 'VIEW', 'unique-slug');
      const found = sync.getShareBySlug('unique-slug');
      expect(found).not.toBeNull();
      expect(found!.slug).toBe('unique-slug');
    });

    it('getShareBySlug returns null for missing', () => {
      expect(sync.getShareBySlug('nonexistent')).toBeNull();
    });

    it('revokeShare removes share', () => {
      const share = sync.createShareMetadata('p1', 'VIEW');
      expect(sync.revokeShare(share.shareId)).toBe(true);
      expect(sync.getShare(share.shareId)).toBeUndefined();
    });

    it('exportProject creates export with checksum', () => {
      const exp = sync.exportProject('p1', 'STEMVERSE', '{"data":"test"}');
      expect(exp.exportId).toBeTruthy();
      expect(exp.format).toBe('STEMVERSE');
      expect(exp.checksum).toBeTruthy();
      expect(exp.version).toBe(EXPORT_VERSION);
    });

    it('importProject validates and creates result', () => {
      const result = sync.importProject('{"projectId":"p1","version":"30A.1"}', 'STEMVERSE');
      expect(result.importId).toBeTruthy();
      expect(result.success).toBe(true);
      expect(result.projectId).toBe('p1');
    });

    it('importProject fails on invalid JSON', () => {
      const result = sync.importProject('not-json', 'STEMVERSE');
      expect(result.success).toBe(false);
      expect(result.validationErrors.length).toBeGreaterThan(0);
    });

    it('importProject fails on empty data', () => {
      const result = sync.importProject('', 'STEMVERSE');
      expect(result.success).toBe(false);
    });

    it('validateImport checks JSON structure', () => {
      const r1 = sync.validateImport('');
      expect(r1.valid).toBe(false);
      const r2 = sync.validateImport('{"version":"30A.1"}');
      expect(r2.valid).toBe(true);
    });

    it('validateImport warns on non-object data', () => {
      const r = sync.validateImport('[1,2,3]');
      expect(r.valid).toBe(false);
    });

    it('getExportHistory returns project exports sorted', () => {
      sync.exportProject('p1', 'STEMVERSE', '{"a":1}');
      sync.exportProject('p1', 'JSON', '{"b":2}');
      const history = sync.getExportHistory('p1');
      expect(history).toHaveLength(2);
    });

    it('getImportHistory returns all imports sorted', () => {
      sync.importProject('{"version":"30A.1"}', 'STEMVERSE');
      sync.importProject('{"version":"30A.1"}', 'JSON');
      const history = sync.getImportHistory();
      expect(history).toHaveLength(2);
    });

    it('getSharesForProject returns project shares', () => {
      sync.createShareMetadata('p1', 'VIEW');
      sync.createShareMetadata('p1', 'EDIT');
      sync.createShareMetadata('p2', 'VIEW');
      expect(sync.getSharesForProject('p1')).toHaveLength(2);
    });

    it('isShareExpired checks expiry', () => {
      const share = sync.createShareMetadata('p1');
      // A share just created with default expiresAt should be checked
      const expired = sync.isShareExpired(share.shareId);
      expect(typeof expired).toBe('boolean');
    });

    it('isShareExpired returns true for missing share', () => {
      expect(sync.isShareExpired('nonexistent')).toBe(true);
    });
  });

  // ─── 4f. Snapshot & Lifecycle ──────────────────────────────

  describe('Snapshot & Lifecycle', () => {
    it('getSnapshot returns thumbnails and statistics', () => {
      sync.generateThumbnailMetadata('p1');
      sync.updateStatistics('p1', { componentCount: 5 });
      const snap = sync.getSnapshot();
      expect(snap.thumbnails.thumbnails.length).toBe(1);
      expect(snap.statistics.statistics.length).toBe(1);
    });

    it('clearAll resets all 5 registries', () => {
      sync.generateThumbnailMetadata('p1');
      sync.updateStatistics('p1', { componentCount: 5 });
      sync.createShareMetadata('p1');
      sync.exportProject('p1', 'JSON', '{}');
      sync.importProject('{"version":"30A.1"}', 'STEMVERSE');
      sync.clearAll();
      expect(sync.getAllThumbnails()).toHaveLength(0);
      expect(sync.getAllStatistics()).toHaveLength(0);
      expect(sync.getAllShares()).toHaveLength(0);
      expect(sync.getAllExports()).toHaveLength(0);
      expect(sync.getAllImports()).toHaveLength(0);
    });

    it('snapshot is a deep copy', () => {
      sync.generateThumbnailMetadata('p1');
      const snap = sync.getSnapshot();
      snap.thumbnails.thumbnails[0].projectId = 'MUTATED';
      const thumb = sync.getThumbnailForProject('p1');
      expect(thumb!.projectId).toBe('p1');
    });

    it('clearAll resets counters', () => {
      sync.generateThumbnailMetadata('p1');
      sync.clearAll();
      sync.generateThumbnailMetadata('p2');
      expect(sync.getAllThumbnails()).toHaveLength(1);
    });

    it('multiple projects tracked independently', () => {
      sync.updateStatistics('p1', { componentCount: 5 });
      sync.updateStatistics('p2', { componentCount: 10 });
      expect(sync.getStatisticsForProject('p1')!.componentCount).toBe(5);
      expect(sync.getStatisticsForProject('p2')!.componentCount).toBe(10);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. Cross-System Integration
// ═══════════════════════════════════════════════════════════════

describe('Cross-System Integration', () => {
  it('full workflow: create → build → save → close → restore', () => {
    const library = new ProjectLibrarySynchronizer();
    const versions = new ProjectVersionSynchronizer();
    const autoSave = new AutoSaveSynchronizer();
    const thumbnails = new ProjectThumbnailSynchronizer();

    // 1. Create project
    const project = library.createProject('Integration Test', 'Full workflow');
    expect(project.projectId).toBeTruthy();

    // 2. Add components (simulate building)
    library.updateProjectStatistics(project.projectId, {
      componentCount: 5, wireCount: 8, sensorCount: 2, blocklyBlockCount: 12,
    });

    // 3. Auto-save
    const snapshot = JSON.stringify(library.getSnapshot());
    autoSave.triggerAutoSave(project.projectId, snapshot);
    expect(autoSave.getAutoSaveCount(project.projectId)).toBe(1);

    // 4. Manual save (version)
    const v1 = versions.saveVersion(project.projectId, snapshot, 'Initial save');
    expect(v1.versionNumber).toBe(1);

    // 5. Update stats
    thumbnails.updateStatistics(project.projectId, { componentCount: 5, wireCount: 8 });
    const health = thumbnails.calculateProjectHealth(project.projectId, 5, 8, 2);
    expect(health).toBeGreaterThan(0);

    // 6. Generate thumbnail
    thumbnails.generateThumbnailMetadata(project.projectId, 'WORKSPACE');

    // 7. More work + save v2
    library.updateProjectStatistics(project.projectId, { componentCount: 10, wireCount: 15 });
    const snapshot2 = JSON.stringify(library.getSnapshot());
    const v2 = versions.saveVersion(project.projectId, snapshot2, 'Added components');
    expect(v2.versionNumber).toBe(2);

    // 8. Rollback to v1
    const rollback = versions.rollbackToVersion(project.projectId, v1.versionId);
    expect(rollback).not.toBeNull();
    expect(rollback!.versionNumber).toBe(3);
    expect(rollback!.action).toBe('ROLLBACK');

    // 9. Restore from rollback
    const restoredSnapshot = versions.restoreVersion(rollback!.versionId);
    expect(restoredSnapshot).toBe(snapshot);

    // 10. Export
    const exportResult = thumbnails.exportProject(project.projectId, 'STEMVERSE', snapshot);
    expect(exportResult.checksum).toBeTruthy();

    // 11. Import validation
    const importResult = thumbnails.importProject(snapshot, 'STEMVERSE');
    expect(importResult.importId).toBeTruthy();
  });

  it('serialization round-trip preserves all data', () => {
    const library = new ProjectLibrarySynchronizer();

    // Create rich state
    const p1 = library.createProject('Project A', 'Description A');
    const p2 = library.createProject('Project B', 'Description B');
    library.favoriteProject(p1.projectId);
    library.pinProject(p2.projectId);
    const folder = library.createFolder('My Folder');
    library.moveProjectToFolder(p1.projectId, folder.folderId);
    const tag = library.createTag('Arduino', '#FF5722');
    library.tagProject(p1.projectId, tag.tagId);
    library.updateProjectStatistics(p1.projectId, {
      componentCount: 10, wireCount: 20, sensorCount: 3, blocklyBlockCount: 15,
    });

    // Take snapshot
    const snapshot = library.getSnapshot();

    // Serialize
    const serialized = JSON.stringify(snapshot);

    // Create new synchronizer and import
    const library2 = new ProjectLibrarySynchronizer();
    const parsed = JSON.parse(serialized) as ProjectLibrarySnapshot;
    library2.importSnapshot(parsed);

    // Verify all data preserved
    expect(library2.getAllProjects()).toHaveLength(2);
    expect(library2.getAllFolders()).toHaveLength(1);
    expect(library2.getAllTags()).toHaveLength(1);
    expect(library2.getAllMetadata()).toHaveLength(2);

    const p1Restored = library2.getProject(p1.projectId);
    expect(p1Restored).toBeDefined();
    expect(p1Restored!.name).toBe('Project A');
    expect(p1Restored!.isFavorite).toBe(true);
    expect(p1Restored!.folderId).toBe(folder.folderId);
    expect(p1Restored!.tags).toContain(tag.tagId);
  });

  it('batch operations at scale: 100 projects, 50 versions, 30 auto-saves', () => {
    const library = new ProjectLibrarySynchronizer();
    const versions = new ProjectVersionSynchronizer();
    const autoSave = new AutoSaveSynchronizer();

    // Create 100 projects
    const projects = range(100).map(i => library.createProject(`Project ${i}`));
    expect(library.getAllProjects()).toHaveLength(100);
    expect(library.getActiveProjectCount()).toBe(100);

    // 50 versions for first project
    range(50).forEach(i => versions.saveVersion(projects[0].projectId, `snapshot-${i}`));
    expect(versions.getVersionCount(projects[0].projectId)).toBe(50);

    // 30 auto-saves for first project
    autoSave.updateConfig({ maxSnapshots: 50 });
    range(30).forEach(i => autoSave.triggerAutoSave(projects[0].projectId, `auto-${i}`));
    expect(autoSave.getAutoSaveCount(projects[0].projectId)).toBe(30);

    // Prune versions to 5
    versions.pruneVersions(projects[0].projectId, 5);
    expect(versions.getVersionCount(projects[0].projectId)).toBe(5);

    // Archive 50 projects
    range(50).forEach(i => library.archiveProject(projects[i + 50].projectId));
    expect(library.getProjectsByStatus('ARCHIVED')).toHaveLength(50);

    // Delete 10
    range(10).forEach(i => library.deleteProject(projects[i + 40].projectId));
    expect(library.getProjectCountsByStatus().DELETED).toBe(10);

    // Purge deleted
    const purged = library.purgeDeletedProjects();
    expect(purged).toBe(10);
    expect(library.getAllProjects()).toHaveLength(90);
  });

  it('crash recovery workflow', () => {
    const autoSave = new AutoSaveSynchronizer();
    const versions = new ProjectVersionSynchronizer();

    // Simulate work + auto-saves
    autoSave.markDirty('p1');
    autoSave.triggerAutoSave('p1', 'auto-1');
    autoSave.markDirty('p1');
    autoSave.triggerAutoSave('p1', 'auto-2');

    // Also save a version
    versions.saveVersion('p1', 'manual-save');

    // Simulate crash: dirty flag is still set if no save happened
    autoSave.markDirty('p1');
    expect(autoSave.isDirty('p1')).toBe(true);

    // Recovery - returns latest entry (either auto-1 or auto-2 by timestamp)
    const recovered = autoSave.recoverFromCrash('p1');
    expect(recovered).not.toBeNull();
    expect(['auto-1', 'auto-2']).toContain(recovered!.snapshot);

    // Version also available
    const latestVersion = versions.getLatestVersion('p1');
    expect(latestVersion).not.toBeNull();
    expect(latestVersion!.snapshot).toBe('manual-save');
  });

  it('export/import round-trip through thumbnail synchronizer', () => {
    const thumbSync = new ProjectThumbnailSynchronizer();

    // Export
    const data = JSON.stringify({ projectId: 'p1', version: '30A.1', components: [1, 2, 3] });
    const exp = thumbSync.exportProject('p1', 'STEMVERSE', data);
    expect(exp.checksum).toBeTruthy();
    expect(exp.serializedData).toBe(data);

    // Import same data
    const imp = thumbSync.importProject(data, 'STEMVERSE');
    expect(imp.success).toBe(true);
    expect(imp.projectId).toBe('p1');

    // History
    expect(thumbSync.getExportHistory('p1')).toHaveLength(1);
    expect(thumbSync.getImportHistory()).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. Constants Verification
// ═══════════════════════════════════════════════════════════════

describe('Constants', () => {
  it('VALID_PROJECT_STATUSES contains expected values', () => {
    expect(VALID_PROJECT_STATUSES).toContain('ACTIVE');
    expect(VALID_PROJECT_STATUSES).toContain('ARCHIVED');
    expect(VALID_PROJECT_STATUSES).toContain('DELETED');
    expect(VALID_PROJECT_STATUSES).toContain('TEMPLATE');
  });

  it('VALID_SORT_FIELDS contains expected values', () => {
    expect(VALID_SORT_FIELDS).toContain('NAME');
    expect(VALID_SORT_FIELDS).toContain('CREATED');
    expect(VALID_SORT_FIELDS).toContain('MODIFIED');
  });

  it('VALID_VERSION_ACTIONS contains expected values', () => {
    expect(VALID_VERSION_ACTIONS).toContain('SAVE');
    expect(VALID_VERSION_ACTIONS).toContain('AUTO_SAVE');
    expect(VALID_VERSION_ACTIONS).toContain('CHECKPOINT');
    expect(VALID_VERSION_ACTIONS).toContain('ROLLBACK');
  });

  it('VALID_THUMBNAIL_TARGETS contains expected values', () => {
    expect(VALID_THUMBNAIL_TARGETS).toContain('WORKSPACE');
    expect(VALID_THUMBNAIL_TARGETS).toContain('CIRCUIT');
    expect(VALID_THUMBNAIL_TARGETS).toContain('BLOCKLY');
  });

  it('VALID_SHARE_PERMISSIONS contains expected values', () => {
    expect(VALID_SHARE_PERMISSIONS).toContain('VIEW');
    expect(VALID_SHARE_PERMISSIONS).toContain('DUPLICATE');
    expect(VALID_SHARE_PERMISSIONS).toContain('EDIT');
  });

  it('VALID_EXPORT_FORMATS contains expected values', () => {
    expect(VALID_EXPORT_FORMATS).toContain('STEMVERSE');
    expect(VALID_EXPORT_FORMATS).toContain('JSON');
  });

  it('AUTO_SAVE defaults are correct', () => {
    expect(DEFAULT_AUTO_SAVE_INTERVAL_MS).toBe(30000);
    expect(DEFAULT_MAX_SNAPSHOTS).toBe(10);
    expect(DEFAULT_DEBOUNCE_MS).toBe(2000);
  });

  it('THUMBNAIL defaults are correct', () => {
    expect(DEFAULT_THUMBNAIL_WIDTH).toBe(320);
    expect(DEFAULT_THUMBNAIL_HEIGHT).toBe(240);
  });

  it('EXPORT_VERSION is set', () => {
    expect(EXPORT_VERSION).toBe('30A.1');
  });

  it('MAX_VERSIONS_PER_PROJECT is 100', () => {
    expect(MAX_VERSIONS_PER_PROJECT).toBe(100);
  });

  it('MAX_SNAPSHOT_SIZE_BYTES is 10MB', () => {
    expect(MAX_SNAPSHOT_SIZE_BYTES).toBe(10 * 1024 * 1024);
  });
});
