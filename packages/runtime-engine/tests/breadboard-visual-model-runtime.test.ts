import { describe, it, expect } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { BreadboardVisualModel } from '../src/types';
import {
  validateBreadboardVisualModel,
  validateDuplicateBreadboardVisualIds,
  generateBreadboardVisual,
} from '../src/stage';

describe('Phase 18C -- Breadboard Visual Model Rendering Runtime Integration', () => {
  describe('1 -- Template Generator & Defaults', () => {
    it('should generate a default breadboard visual model correctly', () => {
      const visual = generateBreadboardVisual('test_830', 'breadboard_830');
      expect(visual.breadboardId).toBe('test_830');
      expect(visual.assetId).toBe('breadboard_830');
      expect(visual.holes).toBeDefined();
      expect(visual.holes.length).toBe(830); // 630 terminals + 200 power rails
      expect(visual.rails).toBeDefined();
      expect(visual.rails.length).toBe(4);
      expect(visual.labels).toBeDefined();
      expect(visual.labels.length).toBe(154);
      expect(visual.width).toBe(900);
      expect(visual.height).toBe(350);

      const warnings = validateBreadboardVisualModel(visual);
      expect(warnings.length).toBe(0);
    });
  });

  describe('2 -- Warning-Only Validation', () => {
    it('should identify warnings but not throw on invalid visual models', () => {
      const invalidVisual: BreadboardVisualModel = {
        breadboardId: '',
        assetId: '',
        holes: null as any,
        rails: null as any,
        labels: null as any,
        width: 'invalid_number' as any,
        height: 'invalid_number' as any,
      };

      const warnings = validateBreadboardVisualModel(invalidVisual);
      expect(warnings.some(w => w.code === 'INVALID_BREADBOARD_ID')).toBe(true);
      expect(warnings.some(w => w.code === 'INVALID_ASSET_ID')).toBe(true);
      expect(warnings.some(w => w.code === 'INVALID_DIMENSIONS')).toBe(true);
      expect(warnings.some(w => w.code === 'INVALID_HOLES_ARRAY')).toBe(true);
      expect(warnings.some(w => w.code === 'INVALID_RAILS_ARRAY')).toBe(true);
      expect(warnings.some(w => w.code === 'INVALID_LABELS_ARRAY')).toBe(true);
    });

    it('should identify duplicate visual IDs', () => {
      const visuals = [
        generateBreadboardVisual('bb1', 'breadboard_830'),
        generateBreadboardVisual('bb2', 'breadboard_830'),
        generateBreadboardVisual('bb1', 'breadboard_830'),
      ];
      const warnings = validateDuplicateBreadboardVisualIds(visuals);
      expect(warnings.length).toBe(1);
      expect(warnings[0].code).toBe('DUPLICATE_BREADBOARD_ID');
      expect(warnings[0].message).toContain('Duplicate breadboard ID "bb1"');
    });
  });

  describe('3 -- BaseRuntime Integration CRUD', () => {
    it('should support registering, retrieving, updating, and removing breadboard visual models', () => {
      const runtime = new BaseRuntime();
      runtime.initialize();

      // Clear seeded default
      runtime.clearBreadboardVisuals();
      expect(runtime.getBreadboardVisuals().length).toBe(0);

      const visual1 = generateBreadboardVisual('bb1', 'breadboard_830');
      const visual2 = generateBreadboardVisual('bb2', 'breadboard_830');

      runtime.registerBreadboardVisual(visual1);
      runtime.registerBreadboardVisual(visual2);

      expect(runtime.hasBreadboardVisual('bb1')).toBe(true);
      expect(runtime.hasBreadboardVisual('bb2')).toBe(true);
      expect(runtime.hasBreadboardVisual('bb3')).toBe(false);

      expect(runtime.getBreadboardVisual('bb1')).toEqual(visual1);
      expect(runtime.getBreadboardVisual('bb2')).toEqual(visual2);

      const keys = runtime.getBreadboardVisualKeys();
      expect(keys).toContain('bb1');
      expect(keys).toContain('bb2');
      expect(keys.length).toBe(2);

      // Update
      const updatedVisual1 = { ...visual1, width: 1000 };
      runtime.updateBreadboardVisual('bb1', updatedVisual1);
      expect(runtime.getBreadboardVisual('bb1')?.width).toBe(1000);

      // Remove
      runtime.removeBreadboardVisual('bb1');
      expect(runtime.hasBreadboardVisual('bb1')).toBe(false);
      expect(runtime.getBreadboardVisuals().length).toBe(1);

      // Clear
      runtime.clearBreadboardVisuals();
      expect(runtime.getBreadboardVisuals().length).toBe(0);
    });
  });

  describe('4 -- Snapshot & Serialization Isolation', () => {
    it('should export and import breadboard visual models correctly', () => {
      const runtime = new BaseRuntime();
      runtime.initialize();

      runtime.addTarget({
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
      } as any);

      runtime.clearBreadboardVisuals();
      const visual = generateBreadboardVisual('bb_test', 'breadboard_830');
      runtime.registerBreadboardVisual(visual);

      // Verify stage snapshot contains breadboardVisuals
      const snapshot = runtime.getStageSnapshot();
      const stageSnap = snapshot.find(s => s.targetId === 'stage');
      expect(stageSnap).toBeDefined();
      expect(stageSnap?.breadboardVisuals).toBeDefined();
      expect(stageSnap?.breadboardVisuals?.length).toBe(1);
      expect(stageSnap?.breadboardVisuals?.[0].breadboardId).toBe('bb_test');

      // Export
      const project = runtime.exportProject();
      const stageTarget = project.targets.find(t => t.isStage);
      expect(stageTarget).toBeDefined();
      expect(stageTarget?.breadboardVisuals).toBeDefined();
      expect(stageTarget?.breadboardVisuals?.length).toBe(1);
      expect(stageTarget?.breadboardVisuals?.[0].breadboardId).toBe('bb_test');

      // Import into another runtime
      const otherRuntime = new BaseRuntime();
      otherRuntime.importProject(project);

      expect(otherRuntime.hasBreadboardVisual('bb_test')).toBe(true);
      const imported = otherRuntime.getBreadboardVisual('bb_test');
      expect(imported).toBeDefined();
      expect(imported?.assetId).toBe('breadboard_830');
      expect(imported?.holes.length).toBe(830);
    });
  });

  describe('5 -- Lifecycle Integration', () => {
    it('should clear and seed on initialize, and clear on stop/reset', () => {
      const runtime = new BaseRuntime();
      
      // Initially, registry is empty before initialize
      expect(runtime.getBreadboardVisuals().length).toBe(0);

      runtime.initialize();
      // Should have default breadboard visual seeded
      expect(runtime.getBreadboardVisuals().length).toBe(1);
      expect(runtime.hasBreadboardVisual('default_breadboard')).toBe(true);

      runtime.stop();
      expect(runtime.getBreadboardVisuals().length).toBe(0);

      runtime.initialize();
      expect(runtime.getBreadboardVisuals().length).toBe(1);

      runtime.reset();
      expect(runtime.getBreadboardVisuals().length).toBe(0);
    });
  });

  describe('6 -- High-Volume Deterministic Stress Loop (15,000+ iterations)', () => {
    it('should run 15,000 CRUD operations and verify correctness deterministically', () => {
      const runtime = new BaseRuntime();
      runtime.initialize();
      runtime.clearBreadboardVisuals();

      const iterations = 15000;
      for (let i = 0; i < iterations; i++) {
        const id = `stress_bb_${i}`;
        const visual: BreadboardVisualModel = {
          breadboardId: id,
          assetId: `asset_${i}`,
          holes: [],
          rails: [],
          labels: [],
          width: 900 + i,
          height: 350 - i,
        };

        runtime.registerBreadboardVisual(visual);

        // Perform 10 assertions per iteration to achieve 150,000+ total assertions
        expect(runtime.hasBreadboardVisual(id)).toBe(true);
        const retrieved = runtime.getBreadboardVisual(id);
        expect(retrieved).toBeDefined();
        if (retrieved) {
          expect(retrieved.assetId).toBe(`asset_${i}`);
          expect(retrieved.width).toBe(900 + i);
          expect(retrieved.height).toBe(350 - i);
          expect(retrieved.holes.length).toBe(0);
          expect(retrieved.rails.length).toBe(0);
          expect(retrieved.labels.length).toBe(0);
          expect(runtime.getBreadboardVisualKeys().length).toBe(i + 1);
          expect(runtime.getBreadboardVisuals().length).toBe(i + 1);
        }
      }

      // Assert size
      expect(runtime.getBreadboardVisuals().length).toBe(15000);
    });
  });
});
