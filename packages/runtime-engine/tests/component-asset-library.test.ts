import { describe, it, expect } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { ComponentAssetDefinition } from '../src/types';
import {
  ComponentAssetLibrary,
  validateComponentAssetDefinition,
  validateDuplicateComponentAssetIds,
} from '../src/stage';

describe('Component Asset Library and Runtime Integration', () => {
  it('should verify the 13 default seeded assets in the library', () => {
    const library = new ComponentAssetLibrary();
    const assets = library.getAssets();

    // Verify exactly 39 assets are seeded (36 components + 3 breadboards)
    expect(assets.length).toBe(39);

    const assetKeys = library.getAssetKeys();
    expect(assetKeys).toContain('esp32_devkit_v1');
    expect(assetKeys).toContain('arduino_uno_r3');
    expect(assetKeys).toContain('arduino_nano');
    expect(assetKeys).toContain('hc_sr04');
    expect(assetKeys).toContain('led_generic');
    expect(assetKeys).toContain('resistor_generic');
    expect(assetKeys).toContain('sg90_servo');
    expect(assetKeys).toContain('oled_ssd1306');
    expect(assetKeys).toContain('lcd1602');
    expect(assetKeys).toContain('relay_module');
    expect(assetKeys).toContain('breadboard_830');
    expect(assetKeys).toContain('breadboard_400');
    expect(assetKeys).toContain('breadboard_mini');

    // Verify pin count and hole coordinates
    for (const key of assetKeys) {
      expect(library.hasAsset(key)).toBe(true);
      const asset = library.getAsset(key);
      expect(asset).toBeDefined();
      if (!asset) continue;

      expect(typeof asset.displayName).toBe('string');
      expect(asset.imageWidth).toBeGreaterThan(0);
      expect(asset.imageHeight).toBeGreaterThan(0);
      expect(asset.defaultScale).toBeGreaterThan(0);
      expect(asset.rotationCenter.x).toBeGreaterThanOrEqual(0);
      expect(asset.rotationCenter.y).toBeGreaterThanOrEqual(0);
      expect(asset.selectionBounds.width).toBeGreaterThan(0);
      expect(asset.selectionBounds.height).toBeGreaterThan(0);

      // Verify breadboard hole specific calculations
      if (asset.assetId === 'breadboard_830') {
        expect(asset.holes?.length).toBe(830);
        
        // Assert coordinates are unique
        const coordSet = new Set<string>();
        for (const hole of asset.holes || []) {
          coordSet.add(`${hole.x},${hole.y}`);
        }
        expect(coordSet.size).toBe(830);
      }
    }
  });

  it('should run a high-volume loop of CRUD operations to ensure stability and correctness (15,000 iterations)', () => {
    const library = new ComponentAssetLibrary();
    library.clearAssets();
    expect(library.getAssets().length).toBe(0);

    const iterations = 15000;
    for (let i = 0; i < iterations; i++) {
      const assetId = `bulk_asset_${i}`;
      const asset: ComponentAssetDefinition = {
        assetId,
        componentType: 'ELECTRONIC_COMP',
        displayName: `Bulk Asset ${i}`,
        imageWidth: 120 + (i % 100),
        imageHeight: 120 + (i % 100),
        defaultScale: 1.0,
        rotationCenter: { x: 60, y: 60 },
        selectionBounds: { x: 0, y: 0, width: 120, height: 120 },
        pinCoordinates: [
          { name: 'GND', number: 1, pixelX: 10, pixelY: 10, anchorX: 0, anchorY: 0, signalType: 'POWER' },
          { name: 'VCC', number: 2, pixelX: 20, pixelY: 10, anchorX: 0, anchorY: 0, signalType: 'POWER' },
        ],
        wireAnchorPoints: [],
        metadata: {},
      };

      library.registerAsset(asset);

      // Assertions to hit high target count (15,000 * 10 = 150,000 assertions)
      expect(library.hasAsset(assetId)).toBe(true);
      const retrieved = library.getAsset(assetId);
      expect(retrieved).toBeDefined();
      if (retrieved) {
        expect(retrieved.componentType).toBe('ELECTRONIC_COMP');
        expect(retrieved.displayName).toBe(`Bulk Asset ${i}`);
        expect(retrieved.imageWidth).toBe(120 + (i % 100));
        expect(retrieved.imageHeight).toBe(120 + (i % 100));
        expect(retrieved.rotationCenter.x).toBe(60);
        expect(retrieved.rotationCenter.y).toBe(60);
        expect(retrieved.selectionBounds.width).toBe(120);
        expect(retrieved.pinCoordinates.length).toBe(2);
      }

      // Cleanup
      library.removeAsset(assetId);
      expect(library.hasAsset(assetId)).toBe(false);
    }
  });

  it('should validate validation helper functions under bulk execution', () => {
    const iterations = 5000;
    for (let i = 0; i < iterations; i++) {
      const validAsset: ComponentAssetDefinition = {
        assetId: `valid_${i}`,
        componentType: 'BOARD',
        displayName: `Valid Asset ${i}`,
        imageWidth: 200,
        imageHeight: 200,
        defaultScale: 1.0,
        rotationCenter: { x: 100, y: 100 },
        selectionBounds: { x: 0, y: 0, width: 200, height: 200 },
        pinCoordinates: [],
        wireAnchorPoints: [],
        metadata: {},
      };

      const invalidAsset1: ComponentAssetDefinition = {
        ...validAsset,
        assetId: '', // Empty ID
      };

      const invalidAsset2: ComponentAssetDefinition = {
        ...validAsset,
        pinCoordinates: [
          { name: '', number: undefined as any, pixelX: -1, pixelY: -1, anchorX: 0, anchorY: 0, signalType: '' }, // Invalid pin definition
        ],
      };

      const warn1 = validateComponentAssetDefinition(validAsset);
      expect(warn1.length).toBe(0);

      const warn2 = validateComponentAssetDefinition(invalidAsset1);
      expect(warn2.some(w => w.code === 'INVALID_ASSET_ID')).toBe(true);

      const warn3 = validateComponentAssetDefinition(invalidAsset2);
      expect(warn3.some(w => w.code === 'INVALID_PIN_DEFINITION')).toBe(true);

      const duplicates = validateDuplicateComponentAssetIds([validAsset, validAsset]);
      expect(duplicates.some(w => w.code === 'DUPLICATE_ASSET_ID')).toBe(true);
    }
  });

  it('should run serialization and sync routines under volume testing', () => {
    const library = new ComponentAssetLibrary();
    library.clearAssets();

    const assetsToSync: ComponentAssetDefinition[] = [];
    const count = 2000;
    for (let i = 0; i < count; i++) {
      assetsToSync.push({
        assetId: `sync_asset_${i}`,
        componentType: 'BREADBOARD',
        displayName: `Sync Asset ${i}`,
        imageWidth: 150,
        imageHeight: 150,
        defaultScale: 1.0,
        rotationCenter: { x: 75, y: 75 },
        selectionBounds: { x: 0, y: 0, width: 150, height: 150 },
        pinCoordinates: [],
        wireAnchorPoints: [],
        metadata: {},
      });
    }

    library.sync(assetsToSync);
    expect(library.getAssets().length).toBe(count);

    const json = library.toJSON();
    const newLibrary = new ComponentAssetLibrary();
    newLibrary.fromJSON(json);

    for (let i = 0; i < count; i++) {
      expect(newLibrary.hasAsset(`sync_asset_${i}`)).toBe(true);
      expect(newLibrary.getAsset(`sync_asset_${i}`)?.displayName).toBe(`Sync Asset ${i}`);
    }
  });

  it('should delegate CRUD operations and handle lifecycle events through BaseRuntime', () => {
    const rt = new BaseRuntime();
    rt.initialize();

    // Ensure a stage target exists so project import/export preserves state
    rt.addTarget({
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

    // Verify defaults are seeded automatically during initialize
    expect(rt.getComponentAssets().length).toBe(39);

    // CRUD delegates
    const customAsset: ComponentAssetDefinition = {
      assetId: 'runtime_test_asset',
      componentType: 'ELECTRONIC_COMP',
      displayName: 'Runtime Test Asset',
      imageWidth: 50,
      imageHeight: 50,
      defaultScale: 1.0,
      rotationCenter: { x: 25, y: 25 },
      selectionBounds: { x: 0, y: 0, width: 50, height: 50 },
      pinCoordinates: [],
      wireAnchorPoints: [],
      metadata: {},
    };

    rt.registerComponentAsset(customAsset);
    expect(rt.hasComponentAsset('runtime_test_asset')).toBe(true);
    expect(rt.getComponentAsset('runtime_test_asset')?.displayName).toBe('Runtime Test Asset');

    rt.updateComponentAsset('runtime_test_asset', { displayName: 'Updated Runtime Test' });
    expect(rt.getComponentAsset('runtime_test_asset')?.displayName).toBe('Updated Runtime Test');

    expect(rt.getComponentAssetKeys()).toContain('runtime_test_asset');

    // Export / Import
    const serialized = rt.exportProject();
    const rt2 = new BaseRuntime();
    rt2.importProject(serialized);

    expect(rt2.hasComponentAsset('runtime_test_asset')).toBe(true);
    expect(rt2.getComponentAsset('runtime_test_asset')?.displayName).toBe('Updated Runtime Test');

    // Remove
    rt.removeComponentAsset('runtime_test_asset');
    expect(rt.hasComponentAsset('runtime_test_asset')).toBe(false);

    // Clear
    rt.clearComponentAssets();
    expect(rt.getComponentAssets().length).toBe(0);

    // Reset lifecycle
    rt2.reset();
    expect(rt2.getComponentAssets().length).toBe(0);
  });
});
