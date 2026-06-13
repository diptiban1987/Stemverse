import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Factory functions
  createDefaultComponentTextureModel,
  createDefaultTextureAtlasModel,
  createDefaultTextureCacheModel,
  createDefaultTextureMetadataModel,
  createDefaultRenderPerformanceModel,
  createDefaultViewportCullingModel,
  createDefaultObjectPoolModel,
  createDefaultDirtyRectModel,
  createDefaultSpatialIndexModel,
  createDefaultRenderBatchModel,
  createDefaultCadGridModel,
  createDefaultDebugOverlayModel,
  createDefaultStartupSceneModel,
  createDefaultPinRenderStateModel,
  // Validators
  validateComponentTextureModel,
  validateTextureAtlasModel,
  validateTextureCacheModel,
  validateTextureMetadataModel,
  validateRenderPerformanceModel,
  validateViewportCullingModel,
  validateObjectPoolModel,
  validateDirtyRectModel,
  validateSpatialIndexModel,
  validateRenderBatchModel,
  validateCadGridModel,
  validateDebugOverlayModel,
  validateStartupSceneModel,
  validatePinRenderStateModel,
  // Duplicate validators
  validateDuplicateComponentTextureIds,
  validateDuplicateTextureAtlasIds,
  validateDuplicateTextureCacheIds,
  validateDuplicateTextureMetadataIds,
  validateDuplicateRenderPerformanceIds,
  validateDuplicateViewportCullingIds,
  validateDuplicateObjectPoolIds,
  validateDuplicateDirtyRectIds,
  validateDuplicateSpatialIndexIds,
  validateDuplicateRenderBatchIds,
  validateDuplicateCadGridIds,
  validateDuplicateDebugOverlayIds,
  validateDuplicateStartupSceneIds,
  validateDuplicatePinRenderStateIds,
  // Engine functions
  createTextureEntry,
  resolveTextureSource,
  calculateTextureMemory,
  shouldEvictTexture,
  evictLeastRecentTexture,
  buildTextureAtlas,
  isObjectInViewport,
  cullObjects,
  calculateViewportBounds,
  expandViewportMargin,
  updateCullingState,
  createPool,
  acquireFromPool,
  releaseToPool,
  getPoolStats,
  markDirty,
  mergeDirtyRects,
  isDirty,
  clearDirtyRects,
  createSpatialIndex,
  insertIntoSpatialIndex,
  removeFromSpatialIndex,
  queryRegion,
  rebuildSpatialIndex,
  createRenderBatch,
  sortIntoBatches,
  getBatchStats,
  optimizeBatchOrder,
  createCadGrid,
  calculateAdaptiveGridSpacing,
  generateGridLines,
  hifiSnapToGrid,
  isSnapEnabled,
  createDebugOverlay,
  updatePerformanceMetrics,
  calculateFPS,
  formatDebugStats,
  toggleDebugMode,
  createDefaultStartupScene,
  calculateStartupLayout,
  validateStartupScene,
  getStartupComponentList,
  createPinRenderState,
  highlightCompatiblePins,
  updatePinHoverState,
  updatePinSelectionState,
  getPinNetColor,
  generateComponentSvgData,
  generateBreadboardSvgData,
  hifiGetAllComponentSvgAssets,
  calculateBezierControlPoints,
  calculateOrthogonalPath,
  calculateWireShadowOffset,
  generateEndpointPlug,
  calculateWireSelectionGlow,
  // Registry & Synchronizer
  HighFidelityRendererRegistry,
  HighFidelityRendererSynchronizer,
  // Constants
  DEFAULT_HIFI_MINOR_GRID_SIZE,
  DEFAULT_HIFI_MAJOR_GRID_SIZE,
  DEFAULT_HIFI_SNAP_SIZE,
  DEFAULT_HIFI_TARGET_FPS,
  DEFAULT_HIFI_MAX_TEXTURE_CACHE_MB,
  DEFAULT_HIFI_WIRE_THICKNESS,
  DEFAULT_HIFI_WIRE_SHADOW_OFFSET,
  DEFAULT_HIFI_MIN_ZOOM,
  DEFAULT_HIFI_MAX_ZOOM,
  DEFAULT_HIFI_PIN_HOVER_RADIUS,
  DEFAULT_HIFI_PIN_HIGHLIGHT_COLOR,
  DEFAULT_HIFI_PIN_INVALID_COLOR,
  DEFAULT_HIFI_MINOR_GRID_COLOR,
  DEFAULT_HIFI_MAJOR_GRID_COLOR,
  DEFAULT_HIFI_MINOR_GRID_ALPHA,
  DEFAULT_HIFI_MAJOR_GRID_ALPHA,
  DEFAULT_HIFI_TEXTURE_ANCHOR,
  DEFAULT_HIFI_TEXTURE_SCALE,
  DEFAULT_HIFI_CULLING_MARGIN_PX,
  DEFAULT_HIFI_SPATIAL_CELL_SIZE,
  DEFAULT_HIFI_POOL_INITIAL_SIZE,
  DEFAULT_HIFI_FPS_WINDOW_SIZE,
  DEFAULT_HIFI_WIRE_GLOW_RADIUS,
  DEFAULT_HIFI_WIRE_GLOW_ALPHA,
  DEFAULT_HIFI_WIRE_GLOW_COLOR,
  DEFAULT_HIFI_WIRE_PLUG_RADIUS,
  VALID_HIFI_TEXTURE_FORMATS,
  VALID_HIFI_TEXTURE_STATES,
  VALID_HIFI_CULLING_MODES,
  VALID_HIFI_GRID_STYLES,
  VALID_HIFI_DEBUG_OVERLAY_MODES,
} from '../src/stage/high-fidelity-renderer-runtime';

// ═══════════════════════════════════════════════════════════════
// SECTION 1: CONSTANTS
// ═══════════════════════════════════════════════════════════════

describe('High Fidelity Renderer Constants', () => {
  it('DEFAULT_HIFI_MINOR_GRID_SIZE is a positive number', () => {
    expect(typeof DEFAULT_HIFI_MINOR_GRID_SIZE).toBe('number');
    expect(DEFAULT_HIFI_MINOR_GRID_SIZE).toBeGreaterThan(0);
  });

  it('DEFAULT_HIFI_MAJOR_GRID_SIZE is a positive number', () => {
    expect(typeof DEFAULT_HIFI_MAJOR_GRID_SIZE).toBe('number');
    expect(DEFAULT_HIFI_MAJOR_GRID_SIZE).toBeGreaterThan(0);
  });

  it('DEFAULT_HIFI_SNAP_SIZE is a positive number', () => {
    expect(typeof DEFAULT_HIFI_SNAP_SIZE).toBe('number');
    expect(DEFAULT_HIFI_SNAP_SIZE).toBeGreaterThan(0);
  });

  it('DEFAULT_HIFI_TARGET_FPS is a positive number', () => {
    expect(typeof DEFAULT_HIFI_TARGET_FPS).toBe('number');
    expect(DEFAULT_HIFI_TARGET_FPS).toBe(60);
  });

  it('DEFAULT_HIFI_MAX_TEXTURE_CACHE_MB is a positive number', () => {
    expect(typeof DEFAULT_HIFI_MAX_TEXTURE_CACHE_MB).toBe('number');
    expect(DEFAULT_HIFI_MAX_TEXTURE_CACHE_MB).toBeGreaterThan(0);
  });

  it('DEFAULT_HIFI_WIRE_THICKNESS is a positive number', () => {
    expect(typeof DEFAULT_HIFI_WIRE_THICKNESS).toBe('number');
    expect(DEFAULT_HIFI_WIRE_THICKNESS).toBeGreaterThan(0);
  });

  it('DEFAULT_HIFI_WIRE_SHADOW_OFFSET is a positive number', () => {
    expect(typeof DEFAULT_HIFI_WIRE_SHADOW_OFFSET).toBe('number');
    expect(DEFAULT_HIFI_WIRE_SHADOW_OFFSET).toBeGreaterThan(0);
  });

  it('DEFAULT_HIFI_MIN_ZOOM is a positive number', () => {
    expect(typeof DEFAULT_HIFI_MIN_ZOOM).toBe('number');
    expect(DEFAULT_HIFI_MIN_ZOOM).toBeGreaterThan(0);
  });

  it('DEFAULT_HIFI_MAX_ZOOM is a positive number', () => {
    expect(typeof DEFAULT_HIFI_MAX_ZOOM).toBe('number');
    expect(DEFAULT_HIFI_MAX_ZOOM).toBeGreaterThan(DEFAULT_HIFI_MIN_ZOOM);
  });

  it('DEFAULT_HIFI_PIN_HOVER_RADIUS is a positive number', () => {
    expect(typeof DEFAULT_HIFI_PIN_HOVER_RADIUS).toBe('number');
    expect(DEFAULT_HIFI_PIN_HOVER_RADIUS).toBeGreaterThan(0);
  });

  it('DEFAULT_HIFI_PIN_HIGHLIGHT_COLOR is a number', () => {
    expect(typeof DEFAULT_HIFI_PIN_HIGHLIGHT_COLOR).toBe('number');
  });

  it('DEFAULT_HIFI_PIN_INVALID_COLOR is a number', () => {
    expect(typeof DEFAULT_HIFI_PIN_INVALID_COLOR).toBe('number');
  });

  it('DEFAULT_HIFI_MINOR_GRID_COLOR is a number', () => {
    expect(typeof DEFAULT_HIFI_MINOR_GRID_COLOR).toBe('number');
  });

  it('DEFAULT_HIFI_MAJOR_GRID_COLOR is a number', () => {
    expect(typeof DEFAULT_HIFI_MAJOR_GRID_COLOR).toBe('number');
  });

  it('DEFAULT_HIFI_MINOR_GRID_ALPHA is between 0 and 1', () => {
    expect(DEFAULT_HIFI_MINOR_GRID_ALPHA).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_HIFI_MINOR_GRID_ALPHA).toBeLessThanOrEqual(1);
  });

  it('DEFAULT_HIFI_MAJOR_GRID_ALPHA is between 0 and 1', () => {
    expect(DEFAULT_HIFI_MAJOR_GRID_ALPHA).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_HIFI_MAJOR_GRID_ALPHA).toBeLessThanOrEqual(1);
  });

  it('DEFAULT_HIFI_TEXTURE_ANCHOR is 0.5', () => {
    expect(DEFAULT_HIFI_TEXTURE_ANCHOR).toBe(0.5);
  });

  it('DEFAULT_HIFI_TEXTURE_SCALE is 1.0', () => {
    expect(DEFAULT_HIFI_TEXTURE_SCALE).toBe(1.0);
  });

  it('DEFAULT_HIFI_CULLING_MARGIN_PX is a positive number', () => {
    expect(DEFAULT_HIFI_CULLING_MARGIN_PX).toBeGreaterThan(0);
  });

  it('DEFAULT_HIFI_SPATIAL_CELL_SIZE is a positive number', () => {
    expect(DEFAULT_HIFI_SPATIAL_CELL_SIZE).toBeGreaterThan(0);
  });

  it('DEFAULT_HIFI_POOL_INITIAL_SIZE is a positive number', () => {
    expect(DEFAULT_HIFI_POOL_INITIAL_SIZE).toBeGreaterThan(0);
  });

  it('DEFAULT_HIFI_FPS_WINDOW_SIZE is a positive number', () => {
    expect(DEFAULT_HIFI_FPS_WINDOW_SIZE).toBeGreaterThan(0);
  });

  it('DEFAULT_HIFI_WIRE_GLOW_RADIUS is a positive number', () => {
    expect(DEFAULT_HIFI_WIRE_GLOW_RADIUS).toBeGreaterThan(0);
  });

  it('DEFAULT_HIFI_WIRE_GLOW_ALPHA is between 0 and 1', () => {
    expect(DEFAULT_HIFI_WIRE_GLOW_ALPHA).toBeGreaterThan(0);
    expect(DEFAULT_HIFI_WIRE_GLOW_ALPHA).toBeLessThanOrEqual(1);
  });

  it('DEFAULT_HIFI_WIRE_GLOW_COLOR is a number', () => {
    expect(typeof DEFAULT_HIFI_WIRE_GLOW_COLOR).toBe('number');
  });

  it('DEFAULT_HIFI_WIRE_PLUG_RADIUS is a positive number', () => {
    expect(DEFAULT_HIFI_WIRE_PLUG_RADIUS).toBeGreaterThan(0);
  });

  it('VALID_HIFI_TEXTURE_FORMATS is a non-empty array', () => {
    expect(Array.isArray(VALID_HIFI_TEXTURE_FORMATS)).toBe(true);
    expect(VALID_HIFI_TEXTURE_FORMATS.length).toBeGreaterThan(0);
    expect(VALID_HIFI_TEXTURE_FORMATS).toContain('SVG');
    expect(VALID_HIFI_TEXTURE_FORMATS).toContain('PNG');
  });

  it('VALID_HIFI_TEXTURE_STATES is a non-empty array', () => {
    expect(Array.isArray(VALID_HIFI_TEXTURE_STATES)).toBe(true);
    expect(VALID_HIFI_TEXTURE_STATES).toContain('LOADED');
    expect(VALID_HIFI_TEXTURE_STATES).toContain('UNLOADED');
  });

  it('VALID_HIFI_CULLING_MODES is a non-empty array', () => {
    expect(Array.isArray(VALID_HIFI_CULLING_MODES)).toBe(true);
    expect(VALID_HIFI_CULLING_MODES).toContain('VIEWPORT');
    expect(VALID_HIFI_CULLING_MODES).toContain('NONE');
  });

  it('VALID_HIFI_GRID_STYLES is a non-empty array', () => {
    expect(Array.isArray(VALID_HIFI_GRID_STYLES)).toBe(true);
    expect(VALID_HIFI_GRID_STYLES).toContain('CAD');
    expect(VALID_HIFI_GRID_STYLES).toContain('DOTS');
  });

  it('VALID_HIFI_DEBUG_OVERLAY_MODES is a non-empty array', () => {
    expect(Array.isArray(VALID_HIFI_DEBUG_OVERLAY_MODES)).toBe(true);
    expect(VALID_HIFI_DEBUG_OVERLAY_MODES).toContain('OFF');
    expect(VALID_HIFI_DEBUG_OVERLAY_MODES).toContain('FULL');
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 2: FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

describe('createDefaultComponentTextureModel', () => {
  it('returns a model with default values', () => {
    const m = createDefaultComponentTextureModel();
    expect(m).toBeDefined();
    expect(m.textureId).toBe('');
    expect(m.textureFormat).toBe('SVG');
    expect(m.textureState).toBe('UNLOADED');
    expect(m.anchorX).toBe(DEFAULT_HIFI_TEXTURE_ANCHOR);
    expect(m.anchorY).toBe(DEFAULT_HIFI_TEXTURE_ANCHOR);
    expect(m.scale).toBe(DEFAULT_HIFI_TEXTURE_SCALE);
    expect(m.rotation).toBe(0);
    expect(m.memoryBytes).toBe(0);
  });

  it('applies overrides', () => {
    const m = createDefaultComponentTextureModel({ textureId: 'tex1', naturalWidth: 128, naturalHeight: 64 });
    expect(m.textureId).toBe('tex1');
    expect(m.naturalWidth).toBe(128);
    expect(m.naturalHeight).toBe(64);
  });

  it('returns a deep copy (mutation safe)', () => {
    const m1 = createDefaultComponentTextureModel({ textureId: 'a' });
    const m2 = createDefaultComponentTextureModel({ textureId: 'a' });
    m1.textureId = 'changed';
    expect(m2.textureId).toBe('a');
  });
});

describe('createDefaultTextureAtlasModel', () => {
  it('returns a model with default values', () => {
    const m = createDefaultTextureAtlasModel();
    expect(m).toBeDefined();
    expect(m.atlasId).toBe('');
    expect(m.width).toBe(0);
    expect(m.height).toBe(0);
    expect(m.textureIds).toEqual([]);
    expect(m.regions).toEqual([]);
    expect(m.format).toBe('SVG');
  });

  it('applies overrides', () => {
    const m = createDefaultTextureAtlasModel({ atlasId: 'atlas1', width: 2048 });
    expect(m.atlasId).toBe('atlas1');
    expect(m.width).toBe(2048);
  });
});

describe('createDefaultTextureCacheModel', () => {
  it('returns a model with default values', () => {
    const m = createDefaultTextureCacheModel();
    expect(m).toBeDefined();
    expect(m.cacheId).toBe('');
    expect(m.isLoaded).toBe(false);
    expect(m.accessCount).toBe(0);
    expect(m.memorySizeBytes).toBe(0);
  });

  it('applies overrides', () => {
    const m = createDefaultTextureCacheModel({ cacheId: 'c1', isLoaded: true, accessCount: 5 });
    expect(m.cacheId).toBe('c1');
    expect(m.isLoaded).toBe(true);
    expect(m.accessCount).toBe(5);
  });
});

describe('createDefaultTextureMetadataModel', () => {
  it('returns a model with default values', () => {
    const m = createDefaultTextureMetadataModel();
    expect(m).toBeDefined();
    expect(m.metadataId).toBe('');
    expect(m.mipmapLevels).toBe(1);
    expect(m.resolution).toBe(1);
    expect(m.isTransparent).toBe(false);
  });

  it('applies overrides', () => {
    const m = createDefaultTextureMetadataModel({ metadataId: 'md1', resolution: 2, isTransparent: true });
    expect(m.metadataId).toBe('md1');
    expect(m.resolution).toBe(2);
    expect(m.isTransparent).toBe(true);
  });
});

describe('createDefaultRenderPerformanceModel', () => {
  it('returns a model with default FPS values', () => {
    const m = createDefaultRenderPerformanceModel();
    expect(m).toBeDefined();
    expect(m.perfId).toBe('');
    expect(m.currentFps).toBe(DEFAULT_HIFI_TARGET_FPS);
    expect(m.averageFps).toBe(DEFAULT_HIFI_TARGET_FPS);
    expect(m.drawCallCount).toBe(0);
    expect(m.frameTimes).toEqual([]);
  });

  it('applies overrides', () => {
    const m = createDefaultRenderPerformanceModel({ perfId: 'p1', currentFps: 30 });
    expect(m.perfId).toBe('p1');
    expect(m.currentFps).toBe(30);
  });
});

describe('createDefaultViewportCullingModel', () => {
  it('returns a model with default viewport', () => {
    const m = createDefaultViewportCullingModel();
    expect(m).toBeDefined();
    expect(m.cullingId).toBe('');
    expect(m.cullingMode).toBe('VIEWPORT');
    expect(m.viewportWidth).toBe(1920);
    expect(m.viewportHeight).toBe(1080);
    expect(m.zoom).toBe(1);
    expect(m.marginPx).toBe(DEFAULT_HIFI_CULLING_MARGIN_PX);
  });

  it('applies overrides', () => {
    const m = createDefaultViewportCullingModel({ cullingId: 'vc1', zoom: 2 });
    expect(m.cullingId).toBe('vc1');
    expect(m.zoom).toBe(2);
  });
});

describe('createDefaultObjectPoolModel', () => {
  it('returns a model with default pool size', () => {
    const m = createDefaultObjectPoolModel();
    expect(m).toBeDefined();
    expect(m.poolId).toBe('');
    expect(m.poolSize).toBe(DEFAULT_HIFI_POOL_INITIAL_SIZE);
    expect(m.activeCount).toBe(0);
    expect(m.availableCount).toBe(DEFAULT_HIFI_POOL_INITIAL_SIZE);
    expect(m.highWatermark).toBe(0);
  });

  it('applies overrides', () => {
    const m = createDefaultObjectPoolModel({ poolId: 'pool1', poolSize: 64 });
    expect(m.poolId).toBe('pool1');
    expect(m.poolSize).toBe(64);
  });
});

describe('createDefaultDirtyRectModel', () => {
  it('returns a model with default values', () => {
    const m = createDefaultDirtyRectModel();
    expect(m).toBeDefined();
    expect(m.dirtyRectId).toBe('');
    expect(m.isDirty).toBe(false);
    expect(m.x).toBe(0);
    expect(m.y).toBe(0);
    expect(m.width).toBe(0);
    expect(m.height).toBe(0);
  });

  it('applies overrides', () => {
    const m = createDefaultDirtyRectModel({ dirtyRectId: 'dr1', isDirty: true, width: 100 });
    expect(m.dirtyRectId).toBe('dr1');
    expect(m.isDirty).toBe(true);
    expect(m.width).toBe(100);
  });
});

describe('createDefaultSpatialIndexModel', () => {
  it('returns a model with default cell size', () => {
    const m = createDefaultSpatialIndexModel();
    expect(m).toBeDefined();
    expect(m.spatialId).toBe('');
    expect(m.cellSize).toBe(DEFAULT_HIFI_SPATIAL_CELL_SIZE);
    expect(m.objectId).toBe('');
  });

  it('applies overrides', () => {
    const m = createDefaultSpatialIndexModel({ spatialId: 'si1', cellSize: 100, objectId: 'obj1' });
    expect(m.spatialId).toBe('si1');
    expect(m.cellSize).toBe(100);
    expect(m.objectId).toBe('obj1');
  });
});

describe('createDefaultRenderBatchModel', () => {
  it('returns a model with default values', () => {
    const m = createDefaultRenderBatchModel();
    expect(m).toBeDefined();
    expect(m.batchId).toBe('');
    expect(m.textureId).toBe('');
    expect(m.objectIds).toEqual([]);
    expect(m.objectCount).toBe(0);
    expect(m.isOptimized).toBe(false);
  });

  it('applies overrides', () => {
    const m = createDefaultRenderBatchModel({ batchId: 'b1', objectIds: ['a', 'b'], objectCount: 2 });
    expect(m.batchId).toBe('b1');
    expect(m.objectIds).toEqual(['a', 'b']);
    expect(m.objectCount).toBe(2);
  });
});

describe('createDefaultCadGridModel', () => {
  it('returns a model with default grid settings', () => {
    const m = createDefaultCadGridModel();
    expect(m).toBeDefined();
    expect(m.cadGridId).toBe('');
    expect(m.gridStyle).toBe('CAD');
    expect(m.minorSpacing).toBe(DEFAULT_HIFI_MINOR_GRID_SIZE);
    expect(m.majorSpacing).toBe(DEFAULT_HIFI_MAJOR_GRID_SIZE);
    expect(m.snapSize).toBe(DEFAULT_HIFI_SNAP_SIZE);
    expect(m.snapEnabled).toBe(true);
    expect(m.visible).toBe(true);
    expect(m.adaptiveZoom).toBe(true);
  });

  it('applies overrides', () => {
    const m = createDefaultCadGridModel({ cadGridId: 'g1', snapEnabled: false, gridStyle: 'DOTS' });
    expect(m.cadGridId).toBe('g1');
    expect(m.snapEnabled).toBe(false);
    expect(m.gridStyle).toBe('DOTS');
  });
});

describe('createDefaultDebugOverlayModel', () => {
  it('returns a model with OFF mode by default', () => {
    const m = createDefaultDebugOverlayModel();
    expect(m).toBeDefined();
    expect(m.debugId).toBe('');
    expect(m.mode).toBe('OFF');
    expect(m.isVisible).toBe(false);
    expect(m.currentFps).toBe(0);
    expect(m.drawCallCount).toBe(0);
  });

  it('applies overrides', () => {
    const m = createDefaultDebugOverlayModel({ debugId: 'd1', mode: 'FULL', isVisible: true });
    expect(m.debugId).toBe('d1');
    expect(m.mode).toBe('FULL');
    expect(m.isVisible).toBe(true);
  });
});

describe('createDefaultStartupSceneModel', () => {
  it('returns a model with default scene name', () => {
    const m = createDefaultStartupSceneModel();
    expect(m).toBeDefined();
    expect(m.sceneId).toBe('');
    expect(m.sceneName).toBe('Default Startup Scene');
    expect(m.componentPlacements).toEqual([]);
    expect(m.wireConnections).toEqual([]);
    expect(m.cameraZoom).toBe(1);
    expect(m.gridVisible).toBe(true);
  });

  it('applies overrides', () => {
    const m = createDefaultStartupSceneModel({ sceneId: 's1', sceneName: 'Custom' });
    expect(m.sceneId).toBe('s1');
    expect(m.sceneName).toBe('Custom');
  });
});

describe('createDefaultPinRenderStateModel', () => {
  it('returns a model with default pin render state', () => {
    const m = createDefaultPinRenderStateModel();
    expect(m).toBeDefined();
    expect(m.pinRenderId).toBe('');
    expect(m.pinId).toBe('');
    expect(m.isHovered).toBe(false);
    expect(m.isSelected).toBe(false);
    expect(m.isHighlighted).toBe(false);
    expect(m.isCompatibleTarget).toBe(false);
    expect(m.isInvalidTarget).toBe(false);
    expect(m.highlightColor).toBe(DEFAULT_HIFI_PIN_HIGHLIGHT_COLOR);
    expect(m.hoverRadius).toBe(DEFAULT_HIFI_PIN_HOVER_RADIUS);
  });

  it('applies overrides', () => {
    const m = createDefaultPinRenderStateModel({ pinRenderId: 'pr1', pinId: 'pin1', isHovered: true });
    expect(m.pinRenderId).toBe('pr1');
    expect(m.pinId).toBe('pin1');
    expect(m.isHovered).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 3: MODEL VALIDATORS (valid models → 0 warnings)
// ═══════════════════════════════════════════════════════════════

describe('validateComponentTextureModel', () => {
  it('returns no warnings for a valid model', () => {
    const m = createDefaultComponentTextureModel({ textureId: 't1', componentType: 'LED' });
    const w = validateComponentTextureModel(m);
    expect(w).toHaveLength(0);
  });

  it('warns when textureId is empty', () => {
    const m = createDefaultComponentTextureModel({ componentType: 'LED' });
    const w = validateComponentTextureModel(m);
    expect(w.length).toBeGreaterThan(0);
  });

  it('warns on negative naturalWidth', () => {
    const m = createDefaultComponentTextureModel({ textureId: 't', componentType: 'LED', naturalWidth: -1 });
    const w = validateComponentTextureModel(m);
    expect(w.some(x => x.code === 'HIFI_TEX_NEG_W')).toBe(true);
  });

  it('warns on invalid textureFormat', () => {
    const m = createDefaultComponentTextureModel({ textureId: 't', componentType: 'LED', textureFormat: 'BMP' as never });
    const w = validateComponentTextureModel(m);
    expect(w.some(x => x.code === 'HIFI_TEX_BAD_FORMAT')).toBe(true);
  });
});

describe('validateTextureAtlasModel', () => {
  it('returns no warnings for a valid model', () => {
    const m = createDefaultTextureAtlasModel({ atlasId: 'a1', width: 1024, height: 1024 });
    const w = validateTextureAtlasModel(m);
    expect(w).toHaveLength(0);
  });

  it('warns when atlasId is empty', () => {
    const w = validateTextureAtlasModel(createDefaultTextureAtlasModel({ width: 1024, height: 1024 }));
    expect(w.length).toBeGreaterThan(0);
  });

  it('warns on non-positive width', () => {
    const w = validateTextureAtlasModel(createDefaultTextureAtlasModel({ atlasId: 'a', width: 0, height: 1 }));
    expect(w.some(x => x.code === 'HIFI_ATLAS_BAD_W')).toBe(true);
  });
});

describe('validateTextureCacheModel', () => {
  it('returns no warnings for a valid model', () => {
    const m = createDefaultTextureCacheModel({ cacheId: 'c1', textureId: 't1' });
    const w = validateTextureCacheModel(m);
    expect(w).toHaveLength(0);
  });

  it('warns when cacheId is empty', () => {
    const w = validateTextureCacheModel(createDefaultTextureCacheModel({ textureId: 't1' }));
    expect(w.length).toBeGreaterThan(0);
  });

  it('warns on negative memorySizeBytes', () => {
    const w = validateTextureCacheModel(createDefaultTextureCacheModel({ cacheId: 'c', textureId: 't', memorySizeBytes: -1 }));
    expect(w.some(x => x.code === 'HIFI_CACHE_NEG_MEM')).toBe(true);
  });
});

describe('validateTextureMetadataModel', () => {
  it('returns no warnings for a valid model', () => {
    const m = createDefaultTextureMetadataModel({ metadataId: 'm1', textureId: 't1' });
    const w = validateTextureMetadataModel(m);
    expect(w).toHaveLength(0);
  });

  it('warns when metadataId is empty', () => {
    const w = validateTextureMetadataModel(createDefaultTextureMetadataModel({ textureId: 't' }));
    expect(w.length).toBeGreaterThan(0);
  });

  it('warns on resolution <= 0', () => {
    const w = validateTextureMetadataModel(createDefaultTextureMetadataModel({ metadataId: 'm', textureId: 't', resolution: 0 }));
    expect(w.some(x => x.code === 'HIFI_META_BAD_RES')).toBe(true);
  });
});

describe('validateRenderPerformanceModel', () => {
  it('returns no warnings for a valid model', () => {
    const m = createDefaultRenderPerformanceModel({ perfId: 'p1' });
    const w = validateRenderPerformanceModel(m);
    expect(w).toHaveLength(0);
  });

  it('warns when perfId is empty', () => {
    const w = validateRenderPerformanceModel(createDefaultRenderPerformanceModel());
    expect(w.length).toBeGreaterThan(0);
  });
});

describe('validateViewportCullingModel', () => {
  it('returns no warnings for a valid model', () => {
    const m = createDefaultViewportCullingModel({ cullingId: 'vc1' });
    const w = validateViewportCullingModel(m);
    expect(w).toHaveLength(0);
  });

  it('warns on non-positive viewportWidth', () => {
    const w = validateViewportCullingModel(createDefaultViewportCullingModel({ cullingId: 'vc', viewportWidth: 0 }));
    expect(w.some(x => x.code === 'HIFI_CULL_BAD_W')).toBe(true);
  });
});

describe('validateObjectPoolModel', () => {
  it('returns no warnings for a valid model', () => {
    const m = createDefaultObjectPoolModel({ poolId: 'p1', objectType: 'sprite' });
    const w = validateObjectPoolModel(m);
    expect(w).toHaveLength(0);
  });

  it('warns when poolId is empty', () => {
    const w = validateObjectPoolModel(createDefaultObjectPoolModel({ objectType: 'sprite' }));
    expect(w.length).toBeGreaterThan(0);
  });

  it('warns when activeCount exceeds poolSize', () => {
    const w = validateObjectPoolModel(createDefaultObjectPoolModel({ poolId: 'p', objectType: 'x', activeCount: 100, poolSize: 10 }));
    expect(w.some(x => x.code === 'HIFI_POOL_OVERFLOW')).toBe(true);
  });
});

describe('validateDirtyRectModel', () => {
  it('returns no warnings for a valid model', () => {
    const m = createDefaultDirtyRectModel({ dirtyRectId: 'dr1' });
    const w = validateDirtyRectModel(m);
    expect(w).toHaveLength(0);
  });

  it('warns on negative width', () => {
    const w = validateDirtyRectModel(createDefaultDirtyRectModel({ dirtyRectId: 'd', width: -1 }));
    expect(w.some(x => x.code === 'HIFI_DIRTY_NEG_W')).toBe(true);
  });
});

describe('validateSpatialIndexModel', () => {
  it('returns no warnings for a valid model', () => {
    const m = createDefaultSpatialIndexModel({ spatialId: 'si1' });
    const w = validateSpatialIndexModel(m);
    expect(w).toHaveLength(0);
  });

  it('warns on non-positive cellSize', () => {
    const w = validateSpatialIndexModel(createDefaultSpatialIndexModel({ spatialId: 's', cellSize: 0 }));
    expect(w.some(x => x.code === 'HIFI_SPATIAL_BAD_CELL')).toBe(true);
  });
});

describe('validateRenderBatchModel', () => {
  it('returns no warnings for a valid model', () => {
    const m = createDefaultRenderBatchModel({ batchId: 'b1', textureId: 't1', objectIds: ['o1'], objectCount: 1 });
    const w = validateRenderBatchModel(m);
    expect(w).toHaveLength(0);
  });

  it('warns when objectIds length mismatches objectCount', () => {
    const w = validateRenderBatchModel(createDefaultRenderBatchModel({ batchId: 'b', textureId: 't', objectIds: ['a'], objectCount: 2 }));
    expect(w.some(x => x.code === 'HIFI_BATCH_MISMATCH')).toBe(true);
  });
});

describe('validateCadGridModel', () => {
  it('returns no warnings for a valid model', () => {
    const m = createDefaultCadGridModel({ cadGridId: 'g1' });
    const w = validateCadGridModel(m);
    expect(w).toHaveLength(0);
  });

  it('warns on non-positive minorSpacing', () => {
    const w = validateCadGridModel(createDefaultCadGridModel({ cadGridId: 'g', minorSpacing: 0 }));
    expect(w.some(x => x.code === 'HIFI_GRID_BAD_MINOR')).toBe(true);
  });
});

describe('validateDebugOverlayModel', () => {
  it('returns no warnings for a valid model', () => {
    const m = createDefaultDebugOverlayModel({ debugId: 'd1' });
    const w = validateDebugOverlayModel(m);
    expect(w).toHaveLength(0);
  });

  it('warns on negative currentFps', () => {
    const w = validateDebugOverlayModel(createDefaultDebugOverlayModel({ debugId: 'd', currentFps: -1 }));
    expect(w.some(x => x.code === 'HIFI_DEBUG_NEG_FPS')).toBe(true);
  });
});

describe('validateStartupSceneModel', () => {
  it('returns no warnings for a valid model', () => {
    const m = createDefaultStartupSceneModel({ sceneId: 's1', sceneName: 'Test' });
    const w = validateStartupSceneModel(m);
    expect(w).toHaveLength(0);
  });

  it('warns when sceneId is empty', () => {
    const w = validateStartupSceneModel(createDefaultStartupSceneModel({ sceneName: 'Test' }));
    expect(w.length).toBeGreaterThan(0);
  });

  it('warns on non-positive cameraZoom', () => {
    const w = validateStartupSceneModel(createDefaultStartupSceneModel({ sceneId: 's', sceneName: 'T', cameraZoom: 0 }));
    expect(w.some(x => x.code === 'HIFI_SCENE_BAD_ZOOM')).toBe(true);
  });
});

describe('validatePinRenderStateModel', () => {
  it('returns no warnings for a valid model', () => {
    const m = createDefaultPinRenderStateModel({ pinRenderId: 'pr1', pinId: 'pin1', componentId: 'c1' });
    const w = validatePinRenderStateModel(m);
    expect(w).toHaveLength(0);
  });

  it('warns when pinRenderId is empty', () => {
    const w = validatePinRenderStateModel(createDefaultPinRenderStateModel({ pinId: 'p', componentId: 'c' }));
    expect(w.length).toBeGreaterThan(0);
  });

  it('warns on negative hoverRadius', () => {
    const w = validatePinRenderStateModel(createDefaultPinRenderStateModel({ pinRenderId: 'pr', pinId: 'p', componentId: 'c', hoverRadius: -1 }));
    expect(w.some(x => x.code === 'HIFI_PIN_NEG_RAD')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 4: DUPLICATE ID VALIDATORS
// ═══════════════════════════════════════════════════════════════

describe('validateDuplicateComponentTextureIds', () => {
  it('returns no warnings for unique IDs', () => {
    const models = [
      createDefaultComponentTextureModel({ textureId: 'a' }),
      createDefaultComponentTextureModel({ textureId: 'b' }),
    ];
    expect(validateDuplicateComponentTextureIds(models)).toHaveLength(0);
  });

  it('detects duplicate textureIds', () => {
    const models = [
      createDefaultComponentTextureModel({ textureId: 'dup' }),
      createDefaultComponentTextureModel({ textureId: 'dup' }),
    ];
    expect(validateDuplicateComponentTextureIds(models).length).toBeGreaterThan(0);
  });
});

describe('validateDuplicateTextureAtlasIds', () => {
  it('returns no warnings for unique IDs', () => {
    const models = [createDefaultTextureAtlasModel({ atlasId: 'a1' }), createDefaultTextureAtlasModel({ atlasId: 'a2' })];
    expect(validateDuplicateTextureAtlasIds(models)).toHaveLength(0);
  });

  it('detects duplicate atlasIds', () => {
    const models = [createDefaultTextureAtlasModel({ atlasId: 'x' }), createDefaultTextureAtlasModel({ atlasId: 'x' })];
    expect(validateDuplicateTextureAtlasIds(models).length).toBeGreaterThan(0);
  });
});

describe('validateDuplicateTextureCacheIds', () => {
  it('returns no warnings for unique IDs', () => {
    const models = [createDefaultTextureCacheModel({ cacheId: 'c1' }), createDefaultTextureCacheModel({ cacheId: 'c2' })];
    expect(validateDuplicateTextureCacheIds(models)).toHaveLength(0);
  });

  it('detects duplicate cacheIds', () => {
    const models = [createDefaultTextureCacheModel({ cacheId: 'x' }), createDefaultTextureCacheModel({ cacheId: 'x' })];
    expect(validateDuplicateTextureCacheIds(models).length).toBeGreaterThan(0);
  });
});

describe('validateDuplicateTextureMetadataIds', () => {
  it('returns no warnings for unique IDs', () => {
    const models = [createDefaultTextureMetadataModel({ metadataId: 'm1' }), createDefaultTextureMetadataModel({ metadataId: 'm2' })];
    expect(validateDuplicateTextureMetadataIds(models)).toHaveLength(0);
  });

  it('detects duplicate metadataIds', () => {
    const models = [createDefaultTextureMetadataModel({ metadataId: 'x' }), createDefaultTextureMetadataModel({ metadataId: 'x' })];
    expect(validateDuplicateTextureMetadataIds(models).length).toBeGreaterThan(0);
  });
});

describe('validateDuplicateRenderPerformanceIds', () => {
  it('returns no warnings for unique IDs', () => {
    const models = [createDefaultRenderPerformanceModel({ perfId: 'p1' }), createDefaultRenderPerformanceModel({ perfId: 'p2' })];
    expect(validateDuplicateRenderPerformanceIds(models)).toHaveLength(0);
  });

  it('detects duplicate perfIds', () => {
    const models = [createDefaultRenderPerformanceModel({ perfId: 'x' }), createDefaultRenderPerformanceModel({ perfId: 'x' })];
    expect(validateDuplicateRenderPerformanceIds(models).length).toBeGreaterThan(0);
  });
});

describe('validateDuplicateViewportCullingIds', () => {
  it('returns no warnings for unique IDs', () => {
    const models = [createDefaultViewportCullingModel({ cullingId: 'v1' }), createDefaultViewportCullingModel({ cullingId: 'v2' })];
    expect(validateDuplicateViewportCullingIds(models)).toHaveLength(0);
  });

  it('detects duplicate cullingIds', () => {
    const models = [createDefaultViewportCullingModel({ cullingId: 'x' }), createDefaultViewportCullingModel({ cullingId: 'x' })];
    expect(validateDuplicateViewportCullingIds(models).length).toBeGreaterThan(0);
  });
});

describe('validateDuplicateObjectPoolIds', () => {
  it('returns no warnings for unique IDs', () => {
    const models = [createDefaultObjectPoolModel({ poolId: 'p1' }), createDefaultObjectPoolModel({ poolId: 'p2' })];
    expect(validateDuplicateObjectPoolIds(models)).toHaveLength(0);
  });

  it('detects duplicate poolIds', () => {
    const models = [createDefaultObjectPoolModel({ poolId: 'x' }), createDefaultObjectPoolModel({ poolId: 'x' })];
    expect(validateDuplicateObjectPoolIds(models).length).toBeGreaterThan(0);
  });
});

describe('validateDuplicateDirtyRectIds', () => {
  it('returns no warnings for unique IDs', () => {
    const models = [createDefaultDirtyRectModel({ dirtyRectId: 'd1' }), createDefaultDirtyRectModel({ dirtyRectId: 'd2' })];
    expect(validateDuplicateDirtyRectIds(models)).toHaveLength(0);
  });

  it('detects duplicate dirtyRectIds', () => {
    const models = [createDefaultDirtyRectModel({ dirtyRectId: 'x' }), createDefaultDirtyRectModel({ dirtyRectId: 'x' })];
    expect(validateDuplicateDirtyRectIds(models).length).toBeGreaterThan(0);
  });
});

describe('validateDuplicateSpatialIndexIds', () => {
  it('returns no warnings for unique IDs', () => {
    const models = [createDefaultSpatialIndexModel({ spatialId: 's1' }), createDefaultSpatialIndexModel({ spatialId: 's2' })];
    expect(validateDuplicateSpatialIndexIds(models)).toHaveLength(0);
  });

  it('detects duplicate spatialIds', () => {
    const models = [createDefaultSpatialIndexModel({ spatialId: 'x' }), createDefaultSpatialIndexModel({ spatialId: 'x' })];
    expect(validateDuplicateSpatialIndexIds(models).length).toBeGreaterThan(0);
  });
});

describe('validateDuplicateRenderBatchIds', () => {
  it('returns no warnings for unique IDs', () => {
    const models = [createDefaultRenderBatchModel({ batchId: 'b1' }), createDefaultRenderBatchModel({ batchId: 'b2' })];
    expect(validateDuplicateRenderBatchIds(models)).toHaveLength(0);
  });

  it('detects duplicate batchIds', () => {
    const models = [createDefaultRenderBatchModel({ batchId: 'x' }), createDefaultRenderBatchModel({ batchId: 'x' })];
    expect(validateDuplicateRenderBatchIds(models).length).toBeGreaterThan(0);
  });
});

describe('validateDuplicateCadGridIds', () => {
  it('returns no warnings for unique IDs', () => {
    const models = [createDefaultCadGridModel({ cadGridId: 'g1' }), createDefaultCadGridModel({ cadGridId: 'g2' })];
    expect(validateDuplicateCadGridIds(models)).toHaveLength(0);
  });

  it('detects duplicate cadGridIds', () => {
    const models = [createDefaultCadGridModel({ cadGridId: 'x' }), createDefaultCadGridModel({ cadGridId: 'x' })];
    expect(validateDuplicateCadGridIds(models).length).toBeGreaterThan(0);
  });
});

describe('validateDuplicateDebugOverlayIds', () => {
  it('returns no warnings for unique IDs', () => {
    const models = [createDefaultDebugOverlayModel({ debugId: 'd1' }), createDefaultDebugOverlayModel({ debugId: 'd2' })];
    expect(validateDuplicateDebugOverlayIds(models)).toHaveLength(0);
  });

  it('detects duplicate debugIds', () => {
    const models = [createDefaultDebugOverlayModel({ debugId: 'x' }), createDefaultDebugOverlayModel({ debugId: 'x' })];
    expect(validateDuplicateDebugOverlayIds(models).length).toBeGreaterThan(0);
  });
});

describe('validateDuplicateStartupSceneIds', () => {
  it('returns no warnings for unique IDs', () => {
    const models = [createDefaultStartupSceneModel({ sceneId: 's1' }), createDefaultStartupSceneModel({ sceneId: 's2' })];
    expect(validateDuplicateStartupSceneIds(models)).toHaveLength(0);
  });

  it('detects duplicate sceneIds', () => {
    const models = [createDefaultStartupSceneModel({ sceneId: 'x' }), createDefaultStartupSceneModel({ sceneId: 'x' })];
    expect(validateDuplicateStartupSceneIds(models).length).toBeGreaterThan(0);
  });
});

describe('validateDuplicatePinRenderStateIds', () => {
  it('returns no warnings for unique IDs', () => {
    const models = [createDefaultPinRenderStateModel({ pinRenderId: 'pr1' }), createDefaultPinRenderStateModel({ pinRenderId: 'pr2' })];
    expect(validateDuplicatePinRenderStateIds(models)).toHaveLength(0);
  });

  it('detects duplicate pinRenderIds', () => {
    const models = [createDefaultPinRenderStateModel({ pinRenderId: 'x' }), createDefaultPinRenderStateModel({ pinRenderId: 'x' })];
    expect(validateDuplicatePinRenderStateIds(models).length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 5: TEXTURE MANAGEMENT ENGINE
// ═══════════════════════════════════════════════════════════════

describe('Texture Management Engine', () => {
  describe('createTextureEntry', () => {
    it('creates a texture entry with the generated textureId', () => {
      const entry = createTextureEntry('led_5mm', 'SVG', '<svg></svg>');
      expect(entry).toBeDefined();
      expect(entry.textureId).toBe('tex_led_5mm');
      expect(entry.assetId).toBe('led_5mm');
      expect(entry.textureFormat).toBe('SVG');
      expect(entry.textureState).toBe('LOADED');
      expect(entry.svgData).toBe('<svg></svg>');
    });

    it('sets state to UNLOADED when no data or URL provided', () => {
      const entry = createTextureEntry('res_220', 'PNG');
      expect(entry.textureState).toBe('UNLOADED');
      expect(entry.svgData).toBe('');
      expect(entry.assetPath).toBe('');
    });

    it('sets assetPath when URL is provided', () => {
      const entry = createTextureEntry('esp32', 'PNG', undefined, 'https://example.com/esp32.png');
      expect(entry.textureState).toBe('LOADED');
      expect(entry.assetPath).toBe('https://example.com/esp32.png');
    });
  });

  describe('resolveTextureSource', () => {
    it('returns SVG_DATA when svgData is present', () => {
      const tex = createDefaultComponentTextureModel({ svgData: '<svg>test</svg>', assetPath: 'http://url' });
      const result = resolveTextureSource(tex);
      expect(result.type).toBe('SVG_DATA');
      expect(result.source).toBe('<svg>test</svg>');
    });

    it('returns URL when only assetPath is present', () => {
      const tex = createDefaultComponentTextureModel({ assetPath: 'http://example.com/img.png' });
      const result = resolveTextureSource(tex);
      expect(result.type).toBe('URL');
      expect(result.source).toBe('http://example.com/img.png');
    });

    it('returns NONE when neither svgData nor assetPath is present', () => {
      const tex = createDefaultComponentTextureModel();
      const result = resolveTextureSource(tex);
      expect(result.type).toBe('NONE');
      expect(result.source).toBe('');
    });
  });

  describe('calculateTextureMemory', () => {
    it('returns width * height * 4 for positive dimensions', () => {
      expect(calculateTextureMemory(100, 100, 'PNG')).toBe(40000);
    });

    it('returns 0 for zero or negative dimensions', () => {
      expect(calculateTextureMemory(0, 100, 'PNG')).toBe(0);
      expect(calculateTextureMemory(100, -1, 'SVG')).toBe(0);
    });
  });

  describe('shouldEvictTexture', () => {
    it('returns true when memory exceeds max', () => {
      const cache = createDefaultTextureCacheModel({ memorySizeBytes: 1000 });
      expect(shouldEvictTexture(cache, 500)).toBe(true);
    });

    it('returns false when memory is within max', () => {
      const cache = createDefaultTextureCacheModel({ memorySizeBytes: 100 });
      expect(shouldEvictTexture(cache, 500)).toBe(false);
    });
  });

  describe('evictLeastRecentTexture', () => {
    it('returns the cacheId of the least recently accessed entry', () => {
      const caches = [
        createDefaultTextureCacheModel({ cacheId: 'a', lastAccessTimestamp: 100 }),
        createDefaultTextureCacheModel({ cacheId: 'b', lastAccessTimestamp: 50 }),
        createDefaultTextureCacheModel({ cacheId: 'c', lastAccessTimestamp: 200 }),
      ];
      expect(evictLeastRecentTexture(caches)).toBe('b');
    });

    it('returns empty string for empty array', () => {
      expect(evictLeastRecentTexture([])).toBe('');
    });
  });

  describe('buildTextureAtlas', () => {
    it('builds an atlas from multiple textures', () => {
      const textures = [
        createDefaultComponentTextureModel({ textureId: 't1', naturalWidth: 64, naturalHeight: 64 }),
        createDefaultComponentTextureModel({ textureId: 't2', naturalWidth: 64, naturalHeight: 64 }),
      ];
      const atlas = buildTextureAtlas(textures, 1024);
      expect(atlas).toBeDefined();
      expect(atlas.textureIds).toContain('t1');
      expect(atlas.textureIds).toContain('t2');
      expect(atlas.regions.length).toBe(2);
      expect(atlas.width).toBeGreaterThan(0);
      expect(atlas.height).toBeGreaterThan(0);
    });

    it('handles empty texture array', () => {
      const atlas = buildTextureAtlas([], 1024);
      expect(atlas.textureIds).toHaveLength(0);
      expect(atlas.regions).toHaveLength(0);
    });

    it('wraps rows when exceeding maxAtlasSize', () => {
      const textures = [
        createDefaultComponentTextureModel({ textureId: 't1', naturalWidth: 500, naturalHeight: 100 }),
        createDefaultComponentTextureModel({ textureId: 't2', naturalWidth: 500, naturalHeight: 100 }),
        createDefaultComponentTextureModel({ textureId: 't3', naturalWidth: 500, naturalHeight: 100 }),
      ];
      const atlas = buildTextureAtlas(textures, 600);
      expect(atlas.height).toBeGreaterThan(100);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 6: VIEWPORT CULLING ENGINE
// ═══════════════════════════════════════════════════════════════

describe('Viewport Culling Engine', () => {
  describe('isObjectInViewport', () => {
    it('returns true for overlapping bounds', () => {
      const obj = { x: 50, y: 50, width: 100, height: 100 };
      const vp = { x: 0, y: 0, width: 200, height: 200 };
      expect(isObjectInViewport(obj, vp)).toBe(true);
    });

    it('returns false for non-overlapping bounds', () => {
      const obj = { x: 500, y: 500, width: 10, height: 10 };
      const vp = { x: 0, y: 0, width: 100, height: 100 };
      expect(isObjectInViewport(obj, vp)).toBe(false);
    });

    it('returns true for touching edges', () => {
      const obj = { x: 100, y: 0, width: 50, height: 50 };
      const vp = { x: 0, y: 0, width: 100, height: 100 };
      expect(isObjectInViewport(obj, vp)).toBe(true);
    });
  });

  describe('cullObjects', () => {
    it('separates visible and culled objects', () => {
      const objects = [
        { objectId: 'a', x: 10, y: 10, width: 20, height: 20 },
        { objectId: 'b', x: 500, y: 500, width: 20, height: 20 },
      ];
      const vp = { x: 0, y: 0, width: 100, height: 100 };
      const result = cullObjects(objects, vp);
      expect(result.visible).toHaveLength(1);
      expect(result.culled).toHaveLength(1);
      expect(result.visible[0].objectId).toBe('a');
      expect(result.culled[0].objectId).toBe('b');
    });

    it('handles empty array', () => {
      const result = cullObjects([], { x: 0, y: 0, width: 100, height: 100 });
      expect(result.visible).toHaveLength(0);
      expect(result.culled).toHaveLength(0);
    });
  });

  describe('calculateViewportBounds', () => {
    it('calculates bounds centered on camera at zoom 1', () => {
      const bounds = calculateViewportBounds(500, 300, 1, 800, 600);
      expect(bounds.x).toBe(100);
      expect(bounds.y).toBe(0);
      expect(bounds.width).toBe(800);
      expect(bounds.height).toBe(600);
    });

    it('zooms in reduces viewport size', () => {
      const bounds = calculateViewportBounds(500, 300, 2, 800, 600);
      expect(bounds.width).toBe(400);
      expect(bounds.height).toBe(300);
    });

    it('handles zero zoom as zoom 1', () => {
      const bounds = calculateViewportBounds(0, 0, 0, 800, 600);
      expect(bounds.width).toBe(800);
      expect(bounds.height).toBe(600);
    });
  });

  describe('expandViewportMargin', () => {
    it('expands bounds by margin on all sides', () => {
      const bounds = { x: 100, y: 100, width: 200, height: 200 };
      const expanded = expandViewportMargin(bounds, 50);
      expect(expanded.x).toBe(50);
      expect(expanded.y).toBe(50);
      expect(expanded.width).toBe(300);
      expect(expanded.height).toBe(300);
    });
  });

  describe('updateCullingState', () => {
    it('updates visible and culled counts', () => {
      const culling = createDefaultViewportCullingModel({ cullingId: 'vc1' });
      const updated = updateCullingState(culling, 10, 5, 1000);
      expect(updated.visibleObjectCount).toBe(10);
      expect(updated.culledObjectCount).toBe(5);
      expect(updated.totalObjectCount).toBe(15);
      expect(updated.lastCullTimestamp).toBe(1000);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 7: OBJECT POOLING ENGINE
// ═══════════════════════════════════════════════════════════════

describe('Object Pooling Engine', () => {
  describe('createPool', () => {
    it('creates a pool with correct initial state', () => {
      const pool = createPool('pool1', 'sprite', 16);
      expect(pool.poolId).toBe('pool1');
      expect(pool.objectType).toBe('sprite');
      expect(pool.poolSize).toBe(16);
      expect(pool.activeCount).toBe(0);
      expect(pool.availableCount).toBe(16);
    });
  });

  describe('acquireFromPool', () => {
    it('acquires an object and updates counts', () => {
      const pool = createPool('p', 'obj', 4);
      const acquired = acquireFromPool(pool);
      expect(acquired).not.toBeNull();
      expect(acquired!.activeCount).toBe(1);
      expect(acquired!.availableCount).toBe(3);
      expect(acquired!.totalAllocations).toBe(1);
    });

    it('returns null when pool is exhausted', () => {
      const pool = createPool('p', 'obj', 1);
      const first = acquireFromPool(pool);
      expect(first).not.toBeNull();
      const second = acquireFromPool(first!);
      expect(second).toBeNull();
    });

    it('tracks high watermark', () => {
      let pool = createPool('p', 'obj', 10);
      pool = acquireFromPool(pool)!;
      pool = acquireFromPool(pool)!;
      pool = acquireFromPool(pool)!;
      expect(pool.highWatermark).toBe(3);
    });
  });

  describe('releaseToPool', () => {
    it('releases an object and updates counts', () => {
      let pool = createPool('p', 'obj', 4);
      pool = acquireFromPool(pool)!;
      const released = releaseToPool(pool);
      expect(released).not.toBeNull();
      expect(released!.activeCount).toBe(0);
      expect(released!.availableCount).toBe(4);
      expect(released!.totalReleases).toBe(1);
    });

    it('returns null when no active objects', () => {
      const pool = createPool('p', 'obj', 4);
      expect(releaseToPool(pool)).toBeNull();
    });
  });

  describe('getPoolStats', () => {
    it('calculates utilization correctly', () => {
      let pool = createPool('p', 'obj', 4);
      pool = acquireFromPool(pool)!;
      pool = acquireFromPool(pool)!;
      const stats = getPoolStats(pool);
      expect(stats.utilization).toBe(0.5);
      expect(stats.highWatermark).toBe(2);
      expect(stats.totalAllocations).toBe(2);
    });

    it('returns 0 utilization for empty pool size', () => {
      const pool = createDefaultObjectPoolModel({ poolSize: 0, activeCount: 0 });
      const stats = getPoolStats(pool);
      expect(stats.utilization).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 8: DIRTY RECTANGLE ENGINE
// ═══════════════════════════════════════════════════════════════

describe('Dirty Rectangle Engine', () => {
  describe('markDirty', () => {
    it('creates a dirty rect with correct properties', () => {
      const rect = markDirty('obj1', 10, 20, 100, 50, 42);
      expect(rect.dirtyRectId).toBe('dirty_obj1_42');
      expect(rect.objectId).toBe('obj1');
      expect(rect.x).toBe(10);
      expect(rect.y).toBe(20);
      expect(rect.width).toBe(100);
      expect(rect.height).toBe(50);
      expect(rect.isDirty).toBe(true);
      expect(rect.frameMarked).toBe(42);
    });
  });

  describe('mergeDirtyRects', () => {
    it('merges overlapping rectangles', () => {
      const rects = [
        markDirty('a', 0, 0, 100, 100, 1),
        markDirty('b', 50, 50, 100, 100, 1),
      ];
      const merged = mergeDirtyRects(rects);
      expect(merged.length).toBeLessThanOrEqual(1);
    });

    it('keeps non-overlapping rectangles separate', () => {
      const rects = [
        markDirty('a', 0, 0, 10, 10, 1),
        markDirty('b', 500, 500, 10, 10, 1),
      ];
      const merged = mergeDirtyRects(rects);
      expect(merged).toHaveLength(2);
    });

    it('returns deep copy for single rect', () => {
      const rects = [markDirty('a', 0, 0, 10, 10, 1)];
      const merged = mergeDirtyRects(rects);
      expect(merged).toHaveLength(1);
      expect(merged[0].objectId).toBe('a');
    });

    it('handles empty array', () => {
      expect(mergeDirtyRects([])).toHaveLength(0);
    });
  });

  describe('isDirty', () => {
    it('returns true when object has dirty rect', () => {
      const rects = [markDirty('obj1', 0, 0, 10, 10, 1)];
      expect(isDirty('obj1', rects)).toBe(true);
    });

    it('returns false when object has no dirty rect', () => {
      const rects = [markDirty('obj1', 0, 0, 10, 10, 1)];
      expect(isDirty('obj2', rects)).toBe(false);
    });
  });

  describe('clearDirtyRects', () => {
    it('clears all dirty flags', () => {
      const rects = [markDirty('a', 0, 0, 10, 10, 1), markDirty('b', 20, 20, 10, 10, 1)];
      const cleared = clearDirtyRects(rects);
      expect(cleared).toHaveLength(2);
      expect(cleared.every(r => r.isDirty === false)).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 9: SPATIAL INDEX ENGINE
// ═══════════════════════════════════════════════════════════════

describe('Spatial Index Engine', () => {
  describe('createSpatialIndex', () => {
    it('creates a spatial index with given cell size', () => {
      const si = createSpatialIndex(100);
      expect(si).toBeDefined();
      expect(si.spatialId).toBe('spatial_root');
      expect(si.cellSize).toBe(100);
    });

    it('uses default cell size for non-positive input', () => {
      const si = createSpatialIndex(0);
      expect(si.cellSize).toBe(DEFAULT_HIFI_SPATIAL_CELL_SIZE);
    });
  });

  describe('insertIntoSpatialIndex', () => {
    it('inserts an object and calculates cell coordinates', () => {
      const entry = insertIntoSpatialIndex(100, 'obj1', 250, 350, 50, 50);
      expect(entry.spatialId).toBe('spatial_obj1');
      expect(entry.objectId).toBe('obj1');
      expect(entry.cellX).toBe(2);
      expect(entry.cellY).toBe(3);
      expect(entry.objectWidth).toBe(50);
      expect(entry.objectHeight).toBe(50);
    });
  });

  describe('removeFromSpatialIndex', () => {
    it('removes an object from the index', () => {
      const indices = [
        insertIntoSpatialIndex(100, 'obj1', 0, 0, 10, 10),
        insertIntoSpatialIndex(100, 'obj2', 100, 100, 10, 10),
      ];
      const result = removeFromSpatialIndex(indices, 'obj1');
      expect(result).toHaveLength(1);
      expect(result[0].objectId).toBe('obj2');
    });
  });

  describe('queryRegion', () => {
    it('returns objects within the query bounds', () => {
      const indices = [
        insertIntoSpatialIndex(100, 'a', 10, 10, 20, 20),
        insertIntoSpatialIndex(100, 'b', 500, 500, 20, 20),
        insertIntoSpatialIndex(100, 'c', 50, 50, 20, 20),
      ];
      const ids = queryRegion(indices, { x: 0, y: 0, width: 100, height: 100 });
      expect(ids).toContain('a');
      expect(ids).toContain('c');
      expect(ids).not.toContain('b');
    });
  });

  describe('rebuildSpatialIndex', () => {
    it('rebuilds index from a list of objects', () => {
      const objects = [
        { objectId: 'x', x: 0, y: 0, width: 10, height: 10 },
        { objectId: 'y', x: 300, y: 300, width: 10, height: 10 },
      ];
      const result = rebuildSpatialIndex(200, objects);
      expect(result).toHaveLength(2);
      expect(result[0].spatialId).toBe('spatial_x');
      expect(result[1].spatialId).toBe('spatial_y');
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 10: RENDER BATCH ENGINE
// ═══════════════════════════════════════════════════════════════

describe('Render Batch Engine', () => {
  describe('createRenderBatch', () => {
    it('creates a batch with correct properties', () => {
      const batch = createRenderBatch('tex1', ['o1', 'o2', 'o3']);
      expect(batch.batchId).toBe('batch_tex1_3');
      expect(batch.textureId).toBe('tex1');
      expect(batch.objectIds).toEqual(['o1', 'o2', 'o3']);
      expect(batch.objectCount).toBe(3);
      expect(batch.isOptimized).toBe(false);
    });
  });

  describe('sortIntoBatches', () => {
    it('groups objects by texture ID', () => {
      const objects = [
        { objectId: 'a', texId: 'tex1' },
        { objectId: 'b', texId: 'tex2' },
        { objectId: 'c', texId: 'tex1' },
      ];
      const batches = sortIntoBatches(objects, o => o.texId);
      expect(batches).toHaveLength(2);
      const tex1Batch = batches.find(b => b.textureId === 'tex1');
      expect(tex1Batch).toBeDefined();
      expect(tex1Batch!.objectIds).toContain('a');
      expect(tex1Batch!.objectIds).toContain('c');
      expect(tex1Batch!.objectCount).toBe(2);
      expect(tex1Batch!.isOptimized).toBe(true);
    });
  });

  describe('getBatchStats', () => {
    it('calculates batch statistics', () => {
      const batches = [
        createRenderBatch('t1', ['a', 'b']),
        createRenderBatch('t2', ['c']),
      ];
      const stats = getBatchStats(batches);
      expect(stats.totalBatches).toBe(2);
      expect(stats.totalObjects).toBe(3);
      expect(stats.avgBatchSize).toBe(1.5);
    });

    it('returns zeroes for empty batches', () => {
      const stats = getBatchStats([]);
      expect(stats.totalBatches).toBe(0);
      expect(stats.totalObjects).toBe(0);
      expect(stats.avgBatchSize).toBe(0);
    });
  });

  describe('optimizeBatchOrder', () => {
    it('sorts batches by textureId and marks as optimized', () => {
      const batches = [
        createRenderBatch('tex_z', ['a']),
        createRenderBatch('tex_a', ['b', 'c']),
      ];
      const optimized = optimizeBatchOrder(batches);
      expect(optimized[0].textureId).toBe('tex_a');
      expect(optimized[1].textureId).toBe('tex_z');
      expect(optimized.every(b => b.isOptimized)).toBe(true);
      expect(optimized[0].drawCallIndex).toBe(0);
      expect(optimized[1].drawCallIndex).toBe(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 11: CAD GRID ENGINE
// ═══════════════════════════════════════════════════════════════

describe('CAD Grid Engine', () => {
  describe('createCadGrid', () => {
    it('creates a grid with viewport dimensions', () => {
      const grid = createCadGrid(1920, 1080);
      expect(grid.cadGridId).toBe('cad_grid_main');
      expect(grid.viewportWidth).toBe(1920);
      expect(grid.viewportHeight).toBe(1080);
    });
  });

  describe('calculateAdaptiveGridSpacing', () => {
    it('returns base spacing at zoom 1', () => {
      const spacing = calculateAdaptiveGridSpacing(1, 10, 50);
      expect(spacing.minor).toBe(10);
      expect(spacing.major).toBe(50);
    });

    it('increases spacing at low zoom', () => {
      const spacing = calculateAdaptiveGridSpacing(0.2, 10, 50);
      expect(spacing.minor).toBeGreaterThan(10);
      expect(spacing.major).toBeGreaterThan(50);
    });

    it('decreases spacing at high zoom', () => {
      const spacing = calculateAdaptiveGridSpacing(4, 10, 50);
      expect(spacing.minor).toBeLessThan(10);
      expect(spacing.major).toBeLessThan(50);
    });

    it('handles zero zoom as zoom 1', () => {
      const spacing = calculateAdaptiveGridSpacing(0, 10, 50);
      expect(spacing.minor).toBe(10);
      expect(spacing.major).toBe(50);
    });
  });

  describe('generateGridLines', () => {
    it('generates minor and major grid lines', () => {
      const grid = createCadGrid(200, 200);
      const viewport = { x: 0, y: 0, width: 200, height: 200 };
      const lines = generateGridLines(grid, viewport, 1);
      expect(lines.minor.length).toBeGreaterThan(0);
      expect(lines.major.length).toBeGreaterThan(0);
    });
  });

  describe('hifiSnapToGrid', () => {
    it('snaps coordinates to nearest grid point', () => {
      const snapped = hifiSnapToGrid(12, 23, 10);
      expect(snapped.x).toBe(10);
      expect(snapped.y).toBe(20);
    });

    it('snaps with precision', () => {
      const snapped = hifiSnapToGrid(17, 3, 5);
      expect(snapped.x).toBe(15);
      expect(snapped.y).toBe(5);
    });

    it('uses default snap size for non-positive input', () => {
      const snapped = hifiSnapToGrid(7, 7, 0);
      expect(snapped.x).toBe(Math.round(7 / DEFAULT_HIFI_SNAP_SIZE) * DEFAULT_HIFI_SNAP_SIZE);
    });
  });

  describe('isSnapEnabled', () => {
    it('returns true when snapEnabled and snapSize > 0', () => {
      const grid = createDefaultCadGridModel({ cadGridId: 'g', snapEnabled: true, snapSize: 5 });
      expect(isSnapEnabled(grid)).toBe(true);
    });

    it('returns false when snapEnabled is false', () => {
      const grid = createDefaultCadGridModel({ cadGridId: 'g', snapEnabled: false, snapSize: 5 });
      expect(isSnapEnabled(grid)).toBe(false);
    });

    it('returns false when snapSize is 0', () => {
      const grid = createDefaultCadGridModel({ cadGridId: 'g', snapEnabled: true, snapSize: 0 });
      expect(isSnapEnabled(grid)).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 12: DEBUG OVERLAY ENGINE
// ═══════════════════════════════════════════════════════════════

describe('Debug Overlay Engine', () => {
  describe('createDebugOverlay', () => {
    it('creates a debug overlay in FPS mode', () => {
      const overlay = createDebugOverlay('FPS');
      expect(overlay.debugId).toBe('debug_overlay_main');
      expect(overlay.mode).toBe('FPS');
      expect(overlay.isVisible).toBe(true);
    });

    it('creates an overlay with isVisible false in OFF mode', () => {
      const overlay = createDebugOverlay('OFF');
      expect(overlay.mode).toBe('OFF');
      expect(overlay.isVisible).toBe(false);
    });
  });

  describe('updatePerformanceMetrics', () => {
    it('calculates current FPS from delta', () => {
      const perf = createDefaultRenderPerformanceModel({ perfId: 'p1' });
      const updated = updatePerformanceMetrics(perf, 16.67, 10, 5, 1000);
      expect(updated.currentFps).toBeCloseTo(1000 / 16.67, 0);
      expect(updated.drawCallCount).toBe(10);
      expect(updated.textureCount).toBe(5);
      expect(updated.lastUpdateTimestamp).toBe(1000);
    });

    it('handles zero deltaMs', () => {
      const perf = createDefaultRenderPerformanceModel({ perfId: 'p1' });
      const updated = updatePerformanceMetrics(perf, 0, 0, 0, 0);
      expect(updated.currentFps).toBe(0);
    });
  });

  describe('calculateFPS', () => {
    it('returns FPS from frame times', () => {
      const frameTimes = [16, 16, 16, 16, 16];
      const fps = calculateFPS(frameTimes, 5);
      expect(fps).toBeCloseTo(62.5, 0);
    });

    it('returns 0 for empty frame times', () => {
      expect(calculateFPS([], 10)).toBe(0);
    });
  });

  describe('formatDebugStats', () => {
    it('returns FPS line in FPS mode', () => {
      const overlay = createDefaultDebugOverlayModel({ debugId: 'd', mode: 'FPS', currentFps: 60 });
      const lines = formatDebugStats(overlay);
      expect(lines.length).toBeGreaterThanOrEqual(1);
      expect(lines[0]).toContain('FPS');
    });

    it('returns render stats in RENDER_STATS mode', () => {
      const overlay = createDefaultDebugOverlayModel({ debugId: 'd', mode: 'RENDER_STATS', currentFps: 60, drawCallCount: 10 });
      const lines = formatDebugStats(overlay);
      expect(lines.length).toBeGreaterThan(1);
      expect(lines.some(l => l.includes('Draw Calls'))).toBe(true);
    });

    it('returns full stats in FULL mode', () => {
      const overlay = createDefaultDebugOverlayModel({ debugId: 'd', mode: 'FULL', currentFps: 60 });
      const lines = formatDebugStats(overlay);
      expect(lines.some(l => l.includes('Memory'))).toBe(true);
      expect(lines.some(l => l.includes('Render'))).toBe(true);
    });

    it('returns empty array in OFF mode', () => {
      const overlay = createDefaultDebugOverlayModel({ debugId: 'd', mode: 'OFF' });
      expect(formatDebugStats(overlay)).toHaveLength(0);
    });
  });

  describe('toggleDebugMode', () => {
    it('switches mode and updates isVisible', () => {
      const overlay = createDebugOverlay('OFF');
      const toggled = toggleDebugMode(overlay, 'FULL');
      expect(toggled.mode).toBe('FULL');
      expect(toggled.isVisible).toBe(true);
    });

    it('sets isVisible false when switching to OFF', () => {
      const overlay = createDebugOverlay('FULL');
      const toggled = toggleDebugMode(overlay, 'OFF');
      expect(toggled.mode).toBe('OFF');
      expect(toggled.isVisible).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 13: STARTUP SCENE ENGINE
// ═══════════════════════════════════════════════════════════════

describe('Startup Scene Engine', () => {
  describe('createDefaultStartupScene', () => {
    it('creates a default scene with 4 components', () => {
      const scene = createDefaultStartupScene();
      expect(scene.sceneId).toBe('startup_default');
      expect(scene.componentPlacements.length).toBe(4);
      expect(scene.cameraZoom).toBe(1);
      expect(scene.gridVisible).toBe(true);
    });
  });

  describe('calculateStartupLayout', () => {
    it('lays out components with padding', () => {
      const components = [
        { assetId: 'a', width: 100, height: 50 },
        { assetId: 'b', width: 100, height: 60 },
      ];
      const layout = calculateStartupLayout(components);
      expect(layout).toHaveLength(2);
      expect(layout[0].x).toBe(40);
      expect(layout[0].y).toBe(40);
      expect(layout[1].x).toBe(180);
    });

    it('wraps to next row when exceeding max width', () => {
      const components = [
        { assetId: 'a', width: 600, height: 50 },
        { assetId: 'b', width: 600, height: 50 },
        { assetId: 'c', width: 600, height: 50 },
      ];
      const layout = calculateStartupLayout(components);
      expect(layout[2].y).toBeGreaterThan(layout[0].y);
    });
  });

  describe('validateStartupScene', () => {
    it('returns no warnings for valid default scene', () => {
      const scene = createDefaultStartupScene();
      const warnings = validateStartupScene(scene);
      expect(warnings).toHaveLength(0);
    });

    it('warns on empty component placements', () => {
      const scene = createDefaultStartupSceneModel({ sceneId: 's', sceneName: 'T', componentPlacements: [] });
      const warnings = validateStartupScene(scene);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on non-positive cameraZoom', () => {
      const scene = createDefaultStartupSceneModel({
        sceneId: 's', sceneName: 'T', cameraZoom: 0,
        componentPlacements: [{ assetId: 'a', x: 0, y: 0, rotation: 0, scale: 1 }],
      });
      const warnings = validateStartupScene(scene);
      expect(warnings.some(w => w.includes('cameraZoom'))).toBe(true);
    });
  });

  describe('getStartupComponentList', () => {
    it('returns a list of known startup components', () => {
      const list = getStartupComponentList();
      expect(list.length).toBe(4);
      expect(list.some(c => c.componentType === 'ESP32')).toBe(true);
      expect(list.some(c => c.componentType === 'LED')).toBe(true);
      expect(list.some(c => c.componentType === 'RESISTOR')).toBe(true);
      expect(list.some(c => c.componentType === 'BREADBOARD')).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 14: PIN RENDER ENGINE
// ═══════════════════════════════════════════════════════════════

describe('Pin Render Engine', () => {
  describe('createPinRenderState', () => {
    it('creates a pin render state', () => {
      const state = createPinRenderState('pin1', 'comp1');
      expect(state.pinRenderId).toBe('pr_pin1_comp1');
      expect(state.pinId).toBe('pin1');
      expect(state.componentId).toBe('comp1');
      expect(state.isHovered).toBe(false);
      expect(state.isSelected).toBe(false);
    });
  });

  describe('highlightCompatiblePins', () => {
    it('returns compatible pin IDs excluding source and connected', () => {
      const pins = [
        createPinRenderState('p1', 'c1'),
        createPinRenderState('p2', 'c2'),
        createPinRenderState('p3', 'c3'),
      ];
      const result = highlightCompatiblePins('p1', pins, ['p2']);
      expect(result).toContain('p3');
      expect(result).not.toContain('p1');
      expect(result).not.toContain('p2');
    });

    it('returns empty array when all pins are excluded', () => {
      const pins = [createPinRenderState('p1', 'c1')];
      const result = highlightCompatiblePins('p1', pins, []);
      expect(result).toHaveLength(0);
    });
  });

  describe('updatePinHoverState', () => {
    it('sets isHovered to true', () => {
      const pin = createPinRenderState('p1', 'c1');
      const updated = updatePinHoverState(pin, true);
      expect(updated.isHovered).toBe(true);
    });

    it('sets isHovered to false', () => {
      const pin = createDefaultPinRenderStateModel({ pinRenderId: 'pr', isHovered: true });
      const updated = updatePinHoverState(pin, false);
      expect(updated.isHovered).toBe(false);
    });
  });

  describe('updatePinSelectionState', () => {
    it('sets isSelected to true', () => {
      const pin = createPinRenderState('p1', 'c1');
      const updated = updatePinSelectionState(pin, true);
      expect(updated.isSelected).toBe(true);
    });
  });

  describe('getPinNetColor', () => {
    it('returns net color when pin is in a net', () => {
      const nets = [
        { netId: 'n1', pinIds: ['p1', 'p2'], color: 0xFF0000 },
        { netId: 'n2', pinIds: ['p3'], color: 0x00FF00 },
      ];
      expect(getPinNetColor('p2', nets)).toBe(0xFF0000);
      expect(getPinNetColor('p3', nets)).toBe(0x00FF00);
    });

    it('returns default gray for unconnected pin', () => {
      expect(getPinNetColor('pX', [])).toBe(0x888888);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 15: SVG ASSET GENERATOR
// ═══════════════════════════════════════════════════════════════

describe('SVG Asset Generator', () => {
  describe('generateComponentSvgData', () => {
    it('returns a non-empty SVG data URI', () => {
      const svg = generateComponentSvgData('LED');
      expect(svg).toBeDefined();
      expect(svg.length).toBeGreaterThan(0);
      expect(svg).toContain('data:image/svg+xml');
    });
  });

  describe('generateBreadboardSvgData', () => {
    it('returns a non-empty SVG data URI', () => {
      const svg = generateBreadboardSvgData('breadboard_830');
      expect(svg).toBeDefined();
      expect(svg.length).toBeGreaterThan(0);
      expect(svg).toContain('data:image/svg+xml');
    });
  });

  describe('hifiGetAllComponentSvgAssets', () => {
    it('returns a Map with multiple component SVG entries', () => {
      const map = hifiGetAllComponentSvgAssets();
      expect(map).toBeDefined();
      expect(map.size).toBeGreaterThan(0);
      expect(map.has('ESP32')).toBe(true);
      expect(map.has('LED_5MM')).toBe(true);
      expect(map.has('RESISTOR')).toBe(true);
      for (const [, svg] of map) {
        expect(svg).toContain('data:image/svg+xml');
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 16: WIRE RENDERING UPGRADE ENGINE
// ═══════════════════════════════════════════════════════════════

describe('Wire Rendering Upgrade Engine', () => {
  describe('calculateBezierControlPoints', () => {
    it('returns control points for a horizontal wire', () => {
      const cp = calculateBezierControlPoints(0, 100, 200, 100);
      expect(cp).toBeDefined();
      expect(cp.cp1x).toBeGreaterThan(0);
      expect(cp.cp1y).toBe(100);
      expect(cp.cp2x).toBeLessThan(200);
      expect(cp.cp2y).toBe(100);
    });

    it('returns control points for a diagonal wire', () => {
      const cp = calculateBezierControlPoints(0, 0, 300, 400);
      expect(cp.cp1x).toBeGreaterThan(0);
      expect(cp.cp2x).toBeLessThan(300);
    });

    it('handles zero-length wire', () => {
      const cp = calculateBezierControlPoints(100, 100, 100, 100);
      expect(cp.cp1x).toBe(100);
      expect(cp.cp2x).toBe(100);
    });
  });

  describe('calculateOrthogonalPath', () => {
    it('returns a 4-point orthogonal path', () => {
      const path = calculateOrthogonalPath(0, 0, 200, 100);
      expect(path).toHaveLength(4);
      expect(path[0]).toEqual({ x: 0, y: 0 });
      expect(path[3]).toEqual({ x: 200, y: 100 });
      expect(path[1].x).toBe(100);
      expect(path[1].y).toBe(0);
      expect(path[2].x).toBe(100);
      expect(path[2].y).toBe(100);
    });
  });

  describe('calculateWireShadowOffset', () => {
    it('returns shadow offset values', () => {
      const shadow = calculateWireShadowOffset(0x333333, 3);
      expect(shadow.offsetX).toBe(DEFAULT_HIFI_WIRE_SHADOW_OFFSET);
      expect(shadow.offsetY).toBe(DEFAULT_HIFI_WIRE_SHADOW_OFFSET);
      expect(shadow.alpha).toBeGreaterThan(0);
      expect(shadow.alpha).toBeLessThanOrEqual(0.3);
    });
  });

  describe('generateEndpointPlug', () => {
    it('generates plug geometry with default radius', () => {
      const plug = generateEndpointPlug(100, 200, 'RIGHT');
      expect(plug.cx).toBe(100);
      expect(plug.cy).toBe(200);
      expect(plug.radius).toBe(DEFAULT_HIFI_WIRE_PLUG_RADIUS);
      expect(plug.fillColor).toBeDefined();
      expect(plug.strokeColor).toBeDefined();
    });

    it('uses custom radius when provided', () => {
      const plug = generateEndpointPlug(0, 0, 'LEFT', 10);
      expect(plug.radius).toBe(10);
    });
  });

  describe('calculateWireSelectionGlow', () => {
    it('returns glow for selected wire', () => {
      const glow = calculateWireSelectionGlow(3, true, false);
      expect(glow.glowRadius).toBe(3 + DEFAULT_HIFI_WIRE_GLOW_RADIUS);
      expect(glow.glowAlpha).toBe(DEFAULT_HIFI_WIRE_GLOW_ALPHA);
      expect(glow.glowColor).toBe(DEFAULT_HIFI_WIRE_GLOW_COLOR);
    });

    it('returns dimmer glow for hovered wire', () => {
      const glow = calculateWireSelectionGlow(3, false, true);
      expect(glow.glowRadius).toBeGreaterThan(0);
      expect(glow.glowAlpha).toBeLessThan(DEFAULT_HIFI_WIRE_GLOW_ALPHA);
    });

    it('returns zero glow for idle wire', () => {
      const glow = calculateWireSelectionGlow(3, false, false);
      expect(glow.glowRadius).toBe(0);
      expect(glow.glowAlpha).toBe(0);
    });

    it('selected takes priority over hovered', () => {
      const glow = calculateWireSelectionGlow(3, true, true);
      expect(glow.glowColor).toBe(DEFAULT_HIFI_WIRE_GLOW_COLOR);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 17: HighFidelityRendererRegistry
// ═══════════════════════════════════════════════════════════════

describe('HighFidelityRendererRegistry', () => {
  let registry: HighFidelityRendererRegistry<{ textureId: string; value: number; [key: string]: unknown }>;

  beforeEach(() => {
    registry = new HighFidelityRendererRegistry<{ textureId: string; value: number; [key: string]: unknown }>('textureId');
  });

  it('register and get', () => {
    registry.register({ textureId: 'a', value: 1 });
    const m = registry.get('a');
    expect(m).toBeDefined();
    expect(m!.textureId).toBe('a');
    expect(m!.value).toBe(1);
  });

  it('get returns deep copy', () => {
    registry.register({ textureId: 'a', value: 1 });
    const m1 = registry.get('a')!;
    m1.value = 999;
    const m2 = registry.get('a')!;
    expect(m2.value).toBe(1);
  });

  it('get returns undefined for missing key', () => {
    expect(registry.get('missing')).toBeUndefined();
  });

  it('getAll returns models in insertion order', () => {
    registry.register({ textureId: 'b', value: 2 });
    registry.register({ textureId: 'a', value: 1 });
    const all = registry.getAll();
    expect(all).toHaveLength(2);
    expect(all[0].textureId).toBe('b');
    expect(all[1].textureId).toBe('a');
  });

  it('update modifies existing model', () => {
    registry.register({ textureId: 'a', value: 1 });
    registry.update('a', { value: 42 });
    expect(registry.get('a')!.value).toBe(42);
  });

  it('update does nothing for non-existent key', () => {
    registry.update('missing', { value: 42 });
    expect(registry.size).toBe(0);
  });

  it('remove deletes a model', () => {
    registry.register({ textureId: 'a', value: 1 });
    registry.remove('a');
    expect(registry.has('a')).toBe(false);
    expect(registry.size).toBe(0);
  });

  it('clear removes all models', () => {
    registry.register({ textureId: 'a', value: 1 });
    registry.register({ textureId: 'b', value: 2 });
    registry.clear();
    expect(registry.size).toBe(0);
    expect(registry.getAll()).toHaveLength(0);
  });

  it('keys returns ordered keys', () => {
    registry.register({ textureId: 'x', value: 1 });
    registry.register({ textureId: 'y', value: 2 });
    expect(registry.keys()).toEqual(['x', 'y']);
  });

  it('has returns true for existing key', () => {
    registry.register({ textureId: 'a', value: 1 });
    expect(registry.has('a')).toBe(true);
    expect(registry.has('b')).toBe(false);
  });

  it('size returns correct count', () => {
    expect(registry.size).toBe(0);
    registry.register({ textureId: 'a', value: 1 });
    expect(registry.size).toBe(1);
  });

  it('clone creates independent copy', () => {
    registry.register({ textureId: 'a', value: 1 });
    const cloned = registry.clone();
    cloned.update('a', { value: 999 });
    expect(registry.get('a')!.value).toBe(1);
    expect(cloned.get('a')!.value).toBe(999);
  });

  it('toJSON and fromJSON round-trip', () => {
    registry.register({ textureId: 'a', value: 10 });
    registry.register({ textureId: 'b', value: 20 });
    const json = registry.toJSON();
    expect(json.idField).toBe('textureId');
    expect(json.models).toHaveLength(2);

    const newRegistry = new HighFidelityRendererRegistry<{ textureId: string; value: number; [key: string]: unknown }>('textureId');
    newRegistry.fromJSON(json);
    expect(newRegistry.size).toBe(2);
    expect(newRegistry.get('a')!.value).toBe(10);
    expect(newRegistry.get('b')!.value).toBe(20);
  });

  it('re-registering same ID overwrites and does not duplicate order', () => {
    registry.register({ textureId: 'a', value: 1 });
    registry.register({ textureId: 'a', value: 2 });
    expect(registry.size).toBe(1);
    expect(registry.get('a')!.value).toBe(2);
    expect(registry.keys()).toEqual(['a']);
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 18: HighFidelityRendererSynchronizer
// ═══════════════════════════════════════════════════════════════

describe('HighFidelityRendererSynchronizer', () => {
  let sync: HighFidelityRendererSynchronizer;

  beforeEach(() => {
    sync = new HighFidelityRendererSynchronizer();
  });

  it('has all 14 registries', () => {
    expect(sync.componentTextures).toBeDefined();
    expect(sync.textureAtlases).toBeDefined();
    expect(sync.textureCaches).toBeDefined();
    expect(sync.textureMetadata).toBeDefined();
    expect(sync.renderPerformance).toBeDefined();
    expect(sync.viewportCullings).toBeDefined();
    expect(sync.objectPools).toBeDefined();
    expect(sync.dirtyRects).toBeDefined();
    expect(sync.spatialIndices).toBeDefined();
    expect(sync.renderBatches).toBeDefined();
    expect(sync.cadGrids).toBeDefined();
    expect(sync.debugOverlays).toBeDefined();
    expect(sync.startupScenes).toBeDefined();
    expect(sync.pinRenderStates).toBeDefined();
  });

  it('buildSnapshot returns all registry data', () => {
    sync.componentTextures.register(createDefaultComponentTextureModel({ textureId: 't1' }));
    sync.cadGrids.register(createDefaultCadGridModel({ cadGridId: 'g1' }));
    const snapshot = sync.buildSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.componentTextures).toHaveLength(1);
    expect(snapshot.cadGrids).toHaveLength(1);
    expect(snapshot.textureAtlases).toHaveLength(0);
  });

  it('clear empties all registries', () => {
    sync.componentTextures.register(createDefaultComponentTextureModel({ textureId: 't1' }));
    sync.pinRenderStates.register(createDefaultPinRenderStateModel({ pinRenderId: 'pr1' }));
    sync.clear();
    const snapshot = sync.buildSnapshot();
    expect(snapshot.componentTextures).toHaveLength(0);
    expect(snapshot.pinRenderStates).toHaveLength(0);
  });

  it('clone creates independent deep copy', () => {
    sync.componentTextures.register(createDefaultComponentTextureModel({ textureId: 't1', componentType: 'LED' }));
    const cloned = sync.clone();
    cloned.componentTextures.update('t1', { componentType: 'RESISTOR' });
    expect(sync.componentTextures.get('t1')!.componentType).toBe('LED');
    expect(cloned.componentTextures.get('t1')!.componentType).toBe('RESISTOR');
  });

  it('toJSON and fromJSON round-trip preserves data', () => {
    sync.componentTextures.register(createDefaultComponentTextureModel({ textureId: 't1', componentType: 'ESP32' }));
    sync.cadGrids.register(createDefaultCadGridModel({ cadGridId: 'g1', snapSize: 10 }));
    sync.debugOverlays.register(createDefaultDebugOverlayModel({ debugId: 'd1', mode: 'FULL' }));

    const json = sync.toJSON();
    expect(json).toBeDefined();

    const newSync = new HighFidelityRendererSynchronizer();
    newSync.fromJSON(json as Record<string, { models: unknown[] }>);

    expect(newSync.componentTextures.get('t1')!.componentType).toBe('ESP32');
    expect(newSync.cadGrids.get('g1')!.snapSize).toBe(10);
    expect(newSync.debugOverlays.get('d1')!.mode).toBe('FULL');
  });

  it('fromJSON clears existing data before loading', () => {
    sync.componentTextures.register(createDefaultComponentTextureModel({ textureId: 'old' }));
    const json = {
      componentTextures: { idField: 'textureId', models: [createDefaultComponentTextureModel({ textureId: 'new' })] },
    };
    sync.fromJSON(json as Record<string, { models: unknown[] }>);
    expect(sync.componentTextures.has('old')).toBe(false);
    expect(sync.componentTextures.has('new')).toBe(true);
  });
});
