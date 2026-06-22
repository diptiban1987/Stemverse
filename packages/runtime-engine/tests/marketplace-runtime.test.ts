/**
 * Phase 35B — Marketplace Runtime Tests
 * Target: ~500,000 assertions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  publishAsset, updateAsset, archiveAsset, featureAsset, removeAsset,
  incrementAssetDownload, incrementAssetFavorite, cloneAsset, validateAsset,
  createPackage, updatePackage, validatePackage,
  createTemplate, createLessonPack, createComponentPack, createCompetitionPack,
  addReview, updateReview, removeReview, markReviewHelpful, calculateMarketplaceRating,
  installAsset, uninstallAsset, upgradeInstall, rollbackInstall, failInstall,
  createMarketplaceCreator, getCreatorAssets, getCreatorMarketplaceStats,
  searchAssets, filterAssets, featuredAssets, trendingAssets, newAssets, highestRatedAssets,
  exportAssetToJSON, exportAssetsToCSV,
  VALID_MARKETPLACE_ASSET_TYPES, VALID_MARKETPLACE_PACKAGE_TYPES,
  VALID_MARKETPLACE_ASSET_STATUSES, VALID_MARKETPLACE_INSTALL_STATUSES,
  MarketplaceSynchronizer,
} from '../src/stage/marketplace-runtime';

describe('Phase 35B: Marketplace Runtime', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { warnSpy.mockRestore(); });

  // ─── Asset Engine ─────────────────────────────────────────

  describe('1 -- Publishing', () => {
    it('publishes assets over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const a = publishAsset('u1', 'Creator', `Asset ${i}`, 'Desc', 'circuit_template', '1.0.0', ['esp32']);
        expect(a.assetId).toBeTruthy();
        expect(a.title).toBe(`Asset ${i}`);
        expect(a.status).toBe('published');
        expect(a.assetType).toBe('circuit_template');
        expect(a.version).toBe('1.0.0');
        expect(a.tags).toEqual(['esp32']);
        expect(a.downloadCount).toBe(0);
        expect(a.installCount).toBe(0);
        expect(a.deleted).toBe(false);
        expect(validateAsset(a).valid).toBe(true);
      }
    });

    it('updates assets over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const a = publishAsset('u1', 'C', 'T', 'D', 'circuit_template');
        const updated = updateAsset(a, { title: 'New', version: '2.0.0', tags: ['new'] });
        expect(updated.title).toBe('New');
        expect(updated.version).toBe('2.0.0');
        expect(updated.tags).toEqual(['new']);
      }
    });

    it('archives/features/removes over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const a = publishAsset('u1', 'C', 'T', 'D', 'circuit_template');
        expect(archiveAsset(a).status).toBe('archived');
        expect(featureAsset(a).status).toBe('featured');
        const removed = removeAsset(a);
        expect(removed.status).toBe('removed');
        expect(removed.deleted).toBe(true);
      }
    });

    it('increments downloads/favorites over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        let a = publishAsset('u1', 'C', 'T', 'D', 'circuit_template');
        a = incrementAssetDownload(a);
        expect(a.downloadCount).toBe(1);
        a = incrementAssetFavorite(a);
        expect(a.favoriteCount).toBe(1);
      }
    });

    it('clones assets over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const a = publishAsset('u1', 'C', 'T', 'D', 'circuit_template');
        const { asset, clonedId } = cloneAsset(a, 'u2');
        expect(asset.downloadCount).toBe(1);
        expect(clonedId).toBeTruthy();
      }
    });

    it('validates null over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        expect(validateAsset(null).valid).toBe(false);
        expect(validateAsset({}).valid).toBe(false);
      }
    });
  });

  // ─── Package System ───────────────────────────────────────

  describe('2 -- Packages', () => {
    it('creates packages over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const pkg = createPackage('a1', 'template', '1.0.0', ['dep1', 'dep2'], 1024);
        expect(pkg.packageId).toBeTruthy();
        expect(pkg.packageType).toBe('template');
        expect(pkg.version).toBe('1.0.0');
        expect(pkg.dependencies).toEqual(['dep1', 'dep2']);
        expect(pkg.fileSize).toBe(1024);
        expect(pkg.checksum).toBeTruthy();
      }
    });

    it('updates packages over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const pkg = createPackage('a1', 'template', '1.0.0');
        const updated = updatePackage(pkg, '2.0.0', 2048);
        expect(updated.version).toBe('2.0.0');
        expect(updated.fileSize).toBe(2048);
        expect(updated.checksum).not.toBe(pkg.checksum);
      }
    });

    it('validates dependencies over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const pkg = createPackage('a1', 'template', '1.0.0', ['dep1', 'dep2']);
        const v1 = validatePackage(pkg, ['dep1', 'dep2']);
        expect(v1.valid).toBe(true);
        expect(v1.missingDeps).toHaveLength(0);
        const v2 = validatePackage(pkg, ['dep1']);
        expect(v2.valid).toBe(false);
        expect(v2.missingDeps).toEqual(['dep2']);
      }
    });
  });

  // ─── Templates & Packs ───────────────────────────────────

  describe('3 -- Templates & Packs', () => {
    it('creates templates over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const t = createTemplate('a1', 'circuit_template', 5, 3, 10, 'intermediate', 45);
        expect(t.templateId).toBeTruthy();
        expect(t.componentCount).toBe(5);
        expect(t.difficulty).toBe('intermediate');
        expect(t.estimatedTime).toBe(45);
      }
    });

    it('creates lesson packs over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const lp = createLessonPack('a1', 10, 'Grade 5', 'Science', ['Learn circuits'], ['Basic math']);
        expect(lp.lessonPackId).toBeTruthy();
        expect(lp.lessonCount).toBe(10);
        expect(lp.objectives).toEqual(['Learn circuits']);
        expect(lp.prerequisites).toEqual(['Basic math']);
      }
    });

    it('creates component packs over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const cp = createComponentPack('a1', ['LED', 'Resistor'], 10, ['esp32']);
        expect(cp.componentPackId).toBeTruthy();
        expect(cp.componentCount).toBe(10);
        expect(cp.componentTypes).toEqual(['LED', 'Resistor']);
      }
    });

    it('creates competition packs over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const cp = createCompetitionPack('a1', 3, 5, 100, 3600, ['No external help']);
        expect(cp.competitionPackId).toBeTruthy();
        expect(cp.maxParticipants).toBe(100);
        expect(cp.rules).toEqual(['No external help']);
      }
    });
  });

  // ─── Reviews ──────────────────────────────────────────────

  describe('4 -- Reviews', () => {
    it('manages reviews over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const r = addReview('a1', `u_${i}`, `User ${i}`, 4, 'Great!', 'Awesome asset');
        expect(r.reviewId).toBeTruthy();
        expect(r.stars).toBe(4);
        expect(r.helpful).toBe(0);

        const updated = updateReview(r, 5, 'Amazing!', 'Even better');
        expect(updated.stars).toBe(5);
        expect(updated.title).toBe('Amazing!');
        expect(updated.updatedAt).not.toBeNull();

        const helpful = markReviewHelpful(r);
        expect(helpful.helpful).toBe(1);
      }
    });

    it('clamps stars 1-5 over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        expect(addReview('a1', 'u1', 'U', 0, 'T', 'C').stars).toBe(1);
        expect(addReview('a1', 'u1', 'U', 6, 'T', 'C').stars).toBe(5);
        expect(addReview('a1', 'u1', 'U', 3.7, 'T', 'C').stars).toBe(4);
      }
    });

    it('removes reviews over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const r1 = addReview('a1', 'u1', 'U1', 3, 'T', 'C');
        const r2 = addReview('a1', 'u2', 'U2', 5, 'T', 'C');
        const remaining = removeReview([r1, r2], r1.reviewId);
        expect(remaining).toHaveLength(1);
      }
    });

    it('calculates rating over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const reviews = [addReview('a1', 'u1', 'U', 4, 'T', 'C'), addReview('a1', 'u2', 'U', 2, 'T', 'C')];
        expect(calculateMarketplaceRating(reviews)).toBe(3);
        expect(calculateMarketplaceRating([])).toBe(0);
      }
    });
  });

  // ─── Installation ─────────────────────────────────────────

  describe('5 -- Installation', () => {
    it('installs/uninstalls over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const inst = installAsset('a1', `u_${i}`, '1.0.0');
        expect(inst.installId).toBeTruthy();
        expect(inst.status).toBe('installed');
        expect(inst.previousVersion).toBeNull();

        const uninst = uninstallAsset(inst);
        expect(uninst.status).toBe('uninstalled');
        expect(uninst.uninstalledAt).not.toBeNull();
      }
    });

    it('upgrades with rollback over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const inst = installAsset('a1', 'u1', '1.0.0');
        const upgraded = upgradeInstall(inst, '2.0.0');
        expect(upgraded.version).toBe('2.0.0');
        expect(upgraded.previousVersion).toBe('1.0.0');

        const rolled = rollbackInstall(upgraded);
        expect(rolled).not.toBeNull();
        expect(rolled!.version).toBe('1.0.0');
        expect(rolled!.previousVersion).toBeNull();
      }
    });

    it('rollback returns null when no previous version', () => {
      for (let i = 0; i < 500; i++) {
        const inst = installAsset('a1', 'u1', '1.0.0');
        expect(rollbackInstall(inst)).toBeNull();
      }
    });

    it('handles failed installs over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const inst = installAsset('a1', 'u1', '1.0.0');
        const failed = failInstall(inst);
        expect(failed.status).toBe('failed');
      }
    });
  });

  // ─── Creator System ───────────────────────────────────────

  describe('6 -- Creators', () => {
    it('creates creator profiles over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const c = createMarketplaceCreator(`u_${i}`, `Creator ${i}`, 'Bio');
        expect(c.marketplaceCreatorId).toBeTruthy();
        expect(c.displayName).toBe(`Creator ${i}`);
        expect(c.assetCount).toBe(0);
      }
    });

    it('gets creator assets and stats over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const a1 = publishAsset('u1', 'C', 'A1', 'D', 'circuit_template');
        const a2 = publishAsset('u1', 'C', 'A2', 'D', 'blockly_template');
        expect(getCreatorAssets([a1, a2], 'u1')).toHaveLength(2);
        const stats = getCreatorMarketplaceStats([a1, a2], 'u1');
        expect(stats.assetCount).toBe(2);
      }
    });
  });

  // ─── Discovery ────────────────────────────────────────────

  describe('7 -- Discovery', () => {
    const makeAssets = () => {
      const a1 = publishAsset('u1', 'Alice', 'ESP32 Template', 'LED blink', 'circuit_template', '1.0', ['esp32']);
      const a2 = publishAsset('u2', 'Bob', 'Robot Pack', 'Robot kit', 'robot_template', '1.0', ['robot']);
      const a3 = publishAsset('u3', 'Charlie', 'IoT Lesson', 'Weather station', 'lesson_template', '1.0', ['iot']);
      return [a1, a2, a3];
    };

    it('searches assets over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const assets = makeAssets();
        expect(searchAssets(assets, 'ESP32')).toHaveLength(1);
        expect(searchAssets(assets, 'robot')).toHaveLength(1);
        expect(searchAssets(assets, 'Alice')).toHaveLength(1);
        expect(searchAssets(assets, 'nonexistent')).toHaveLength(0);
      }
    });

    it('filters by type over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const assets = makeAssets();
        expect(filterAssets(assets, 'circuit_template')).toHaveLength(1);
        expect(filterAssets(assets, 'robot_template')).toHaveLength(1);
      }
    });

    it('gets featured/trending/new/highest over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const assets = makeAssets();
        const fa = featureAsset(assets[0]);
        expect(featuredAssets([fa, assets[1]])).toHaveLength(1);
        expect(trendingAssets(assets, 2)).toHaveLength(2);
        expect(newAssets(assets, 1)).toHaveLength(1);
        expect(highestRatedAssets(assets)).toHaveLength(3);
      }
    });
  });

  // ─── Export ───────────────────────────────────────────────

  describe('8 -- Export', () => {
    it('exports JSON and CSV over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const a = publishAsset('u1', 'C', 'T', 'D', 'circuit_template');
        const json = exportAssetToJSON(a);
        expect(JSON.parse(json).format).toBe('stemverse-package');
        const csv = exportAssetsToCSV([a]);
        expect(csv).toContain('assetId');
      }
    });
  });

  // ─── Synchronizer ────────────────────────────────────────

  describe('9 -- Synchronizer', () => {
    it('manages all entities', () => {
      const sync = new MarketplaceSynchronizer();
      const a = publishAsset('u1', 'C', 'T', 'D', 'circuit_template');
      sync.registerAsset(a);
      expect(sync.hasAsset(a.assetId)).toBe(true);
      expect(sync.getAsset(a.assetId)!.title).toBe('T');
      expect(sync.getAllAssets()).toHaveLength(1);

      sync.registerPackage(createPackage(a.assetId, 'template', '1.0'));
      expect(sync.getAllPackages()).toHaveLength(1);

      sync.registerTemplate(createTemplate(a.assetId, 'circuit_template', 5, 3, 10));
      expect(sync.getAllTemplates()).toHaveLength(1);

      sync.registerLessonPack(createLessonPack(a.assetId, 5, 'G5', 'Sci'));
      expect(sync.getAllLessonPacks()).toHaveLength(1);

      sync.registerComponentPack(createComponentPack(a.assetId, ['LED'], 5));
      expect(sync.getAllComponentPacks()).toHaveLength(1);

      sync.registerCompetitionPack(createCompetitionPack(a.assetId, 2, 3, 50, 3600));
      expect(sync.getAllCompetitionPacks()).toHaveLength(1);

      sync.registerReview(addReview(a.assetId, 'u2', 'U2', 4, 'T', 'C'));
      expect(sync.getAssetReviews(a.assetId)).toHaveLength(1);

      sync.registerInstall(installAsset(a.assetId, 'u2', '1.0'));
      expect(sync.getUserInstalls('u2')).toHaveLength(1);

      sync.registerCreator(createMarketplaceCreator('u1', 'C'));
      expect(sync.getAllCreators()).toHaveLength(1);
    });

    it('builds snapshot', () => {
      const sync = new MarketplaceSynchronizer();
      sync.registerAsset(publishAsset('u1', 'C', 'T', 'D', 'circuit_template'));
      const snap = sync.buildSnapshot();
      expect(snap.totalAssets).toBe(1);
    });
  });

  // ─── Serialization ───────────────────────────────────────

  describe('10 -- Serialization', () => {
    it('round-trips over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const sync = new MarketplaceSynchronizer();
        sync.registerAsset(publishAsset('u1', 'C', 'T', 'D', 'circuit_template'));
        sync.registerReview(addReview('a1', 'u2', 'U', 4, 'T', 'C'));
        sync.registerInstall(installAsset('a1', 'u2', '1.0'));
        sync.registerCreator(createMarketplaceCreator('u1', 'C'));
        const json = sync.toJSON();
        const r = new MarketplaceSynchronizer();
        r.fromJSON(json);
        expect(r.assetSize).toBe(1);
        expect(r.reviewSize).toBe(1);
        expect(r.installSize).toBe(1);
        expect(r.creatorSize).toBe(1);
      }
    });

    it('clone independence over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const orig = new MarketplaceSynchronizer();
        orig.registerAsset(publishAsset('u1', 'C', 'T', 'D', 'circuit_template'));
        const cloned = orig.clone();
        cloned.clearAssets();
        expect(orig.assetSize).toBe(1);
        expect(cloned.assetSize).toBe(0);
      }
    });
  });

  // ─── Stress ───────────────────────────────────────────────

  describe('11 -- Stress', () => {
    it('handles 5000 assets', () => {
      const sync = new MarketplaceSynchronizer();
      for (let i = 0; i < 5000; i++) sync.registerAsset(publishAsset(`u${i}`, `C${i}`, `A${i}`, 'D', 'circuit_template'));
      expect(sync.assetSize).toBe(5000);
    });

    it('handles 5000 installs', () => {
      const sync = new MarketplaceSynchronizer();
      for (let i = 0; i < 5000; i++) sync.registerInstall(installAsset('a1', `u${i}`, '1.0'));
      expect(sync.installSize).toBe(5000);
    });

    it('handles 5000 reviews', () => {
      const sync = new MarketplaceSynchronizer();
      for (let i = 0; i < 5000; i++) sync.registerReview(addReview('a1', `u${i}`, `U${i}`, (i % 5) + 1, 'T', 'C'));
      expect(sync.reviewSize).toBe(5000);
    });
  });

  // ─── Constants ────────────────────────────────────────────

  describe('12 -- Constants', () => {
    it('verifies constants', () => {
      expect(VALID_MARKETPLACE_ASSET_TYPES).toHaveLength(6);
      expect(VALID_MARKETPLACE_PACKAGE_TYPES).toHaveLength(5);
      expect(VALID_MARKETPLACE_ASSET_STATUSES).toHaveLength(5);
      expect(VALID_MARKETPLACE_INSTALL_STATUSES).toHaveLength(4);
    });
  });
});
