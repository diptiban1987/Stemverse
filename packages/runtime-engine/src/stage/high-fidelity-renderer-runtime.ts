// ═══════════════════════════════════════════════════════════════
// Phase 19D: High Fidelity 3D Component Rendering & Performance
// Foundation — Deterministic metadata-only rendering runtime.
//
// Texture management, viewport culling, object pooling, dirty
// rectangles, spatial indexing, render batching, CAD grid,
// debug overlay, startup scene, pin render, wire rendering.
//
// No Canvas, no WebGL, no Pixi. Simulation data only.
// ═══════════════════════════════════════════════════════════════

import {
  TextureFormat,
  TextureState,
  DebugOverlayMode,
  CullingMode,
  GridStyle,
  ComponentTextureModel,
  TextureAtlasModel,
  TextureCacheModel,
  TextureMetadataModel,
  RenderPerformanceModel,
  ViewportCullingModel,
  ObjectPoolModel,
  DirtyRectModel,
  SpatialIndexModel,
  RenderBatchModel,
  CadGridModel,
  DebugOverlayModel,
  StartupSceneModel,
  PinRenderStateModel,
  HighFidelityRendererSnapshot,
} from '../types';

import { ValidationWarning } from './scene-model';

// ─── Deep Copy Helper ───────────────────────────────────────────

function safeDeepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1: CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Default minor grid spacing in pixels */
export const DEFAULT_HIFI_MINOR_GRID_SIZE = 10;

/** Default major grid spacing in pixels */
export const DEFAULT_HIFI_MAJOR_GRID_SIZE = 50;

/** Default snap size in pixels */
export const DEFAULT_HIFI_SNAP_SIZE = 5;

/** Default target FPS */
export const DEFAULT_HIFI_TARGET_FPS = 60;

/** Default max texture cache in megabytes */
export const DEFAULT_HIFI_MAX_TEXTURE_CACHE_MB = 256;

/** Default wire thickness in pixels */
export const DEFAULT_HIFI_WIRE_THICKNESS = 3;

/** Default wire shadow offset in pixels */
export const DEFAULT_HIFI_WIRE_SHADOW_OFFSET = 2;

/** Default minimum zoom level */
export const DEFAULT_HIFI_MIN_ZOOM = 0.1;

/** Default maximum zoom level */
export const DEFAULT_HIFI_MAX_ZOOM = 10;

/** Default pin hover detection radius in pixels */
export const DEFAULT_HIFI_PIN_HOVER_RADIUS = 8;

/** Default pin highlight color (green) */
export const DEFAULT_HIFI_PIN_HIGHLIGHT_COLOR = 0x00FF88;

/** Default pin invalid target color (red) */
export const DEFAULT_HIFI_PIN_INVALID_COLOR = 0xFF4444;

/** Default minor grid color (light grey) */
export const DEFAULT_HIFI_MINOR_GRID_COLOR = 0xDDDDDD;

/** Default major grid color (darker grey) */
export const DEFAULT_HIFI_MAJOR_GRID_COLOR = 0xBBBBBB;

/** Default minor grid alpha */
export const DEFAULT_HIFI_MINOR_GRID_ALPHA = 0.3;

/** Default major grid alpha */
export const DEFAULT_HIFI_MAJOR_GRID_ALPHA = 0.6;

/** Default texture anchor */
export const DEFAULT_HIFI_TEXTURE_ANCHOR = 0.5;

/** Default texture scale */
export const DEFAULT_HIFI_TEXTURE_SCALE = 1.0;

/** Default viewport culling margin in pixels */
export const DEFAULT_HIFI_CULLING_MARGIN_PX = 100;

/** Default spatial index cell size */
export const DEFAULT_HIFI_SPATIAL_CELL_SIZE = 200;

/** Default object pool initial size */
export const DEFAULT_HIFI_POOL_INITIAL_SIZE = 32;

/** Default FPS window size for averaging */
export const DEFAULT_HIFI_FPS_WINDOW_SIZE = 60;

/** Default wire glow radius for selected wires */
export const DEFAULT_HIFI_WIRE_GLOW_RADIUS = 6;

/** Default wire glow alpha */
export const DEFAULT_HIFI_WIRE_GLOW_ALPHA = 0.35;

/** Default wire glow color */
export const DEFAULT_HIFI_WIRE_GLOW_COLOR = 0x60A5FA;

/** Default wire endpoint plug radius */
export const DEFAULT_HIFI_WIRE_PLUG_RADIUS = 4;

/** Valid texture formats */
export const VALID_HIFI_TEXTURE_FORMATS: TextureFormat[] = ['PNG', 'WEBP', 'SVG', 'DATA_URI'];

/** Valid texture states */
export const VALID_HIFI_TEXTURE_STATES: TextureState[] = ['UNLOADED', 'LOADING', 'LOADED', 'ERROR', 'CACHED'];

/** Valid debug overlay modes */
export const VALID_HIFI_DEBUG_OVERLAY_MODES: DebugOverlayMode[] = ['OFF', 'FPS', 'RENDER_STATS', 'FULL'];

/** Valid culling modes */
export const VALID_HIFI_CULLING_MODES: CullingMode[] = ['NONE', 'VIEWPORT', 'FRUSTUM'];

/** Valid grid styles */
export const VALID_HIFI_GRID_STYLES: GridStyle[] = ['DOTS', 'LINES', 'CROSSHAIRS', 'CAD'];

// ═══════════════════════════════════════════════════════════════
// SECTION 2: FACTORY FUNCTIONS (14)
// ═══════════════════════════════════════════════════════════════

/** Create a default ComponentTextureModel */
export function createDefaultComponentTextureModel(
  overrides: Partial<ComponentTextureModel> = {},
): ComponentTextureModel {
  return safeDeepCopy({
    textureId: '',
    componentType: '',
    assetId: '',
    textureFormat: 'SVG' as TextureFormat,
    textureState: 'UNLOADED' as TextureState,
    assetPath: '',
    svgData: '',
    naturalWidth: 0,
    naturalHeight: 0,
    anchorX: DEFAULT_HIFI_TEXTURE_ANCHOR,
    anchorY: DEFAULT_HIFI_TEXTURE_ANCHOR,
    scale: DEFAULT_HIFI_TEXTURE_SCALE,
    rotation: 0,
    memoryBytes: 0,
    lastAccessTimestamp: 0,
    futureTextureHints: {},
    ...overrides,
  });
}

/** Create a default TextureAtlasModel */
export function createDefaultTextureAtlasModel(
  overrides: Partial<TextureAtlasModel> = {},
): TextureAtlasModel {
  return safeDeepCopy({
    atlasId: '',
    atlasName: '',
    width: 0,
    height: 0,
    textureIds: [],
    regions: [],
    format: 'SVG' as TextureFormat,
    memoryBytes: 0,
    futureAtlasHints: {},
    ...overrides,
  });
}

/** Create a default TextureCacheModel */
export function createDefaultTextureCacheModel(
  overrides: Partial<TextureCacheModel> = {},
): TextureCacheModel {
  return safeDeepCopy({
    cacheId: '',
    textureId: '',
    isLoaded: false,
    loadTimestamp: 0,
    lastAccessTimestamp: 0,
    accessCount: 0,
    memorySizeBytes: 0,
    evictionPriority: 0,
    futureCacheHints: {},
    ...overrides,
  });
}

/** Create a default TextureMetadataModel */
export function createDefaultTextureMetadataModel(
  overrides: Partial<TextureMetadataModel> = {},
): TextureMetadataModel {
  return safeDeepCopy({
    metadataId: '',
    textureId: '',
    naturalWidth: 0,
    naturalHeight: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    mipmapLevels: 1,
    resolution: 1,
    isTransparent: false,
    futureMetadataHints: {},
    ...overrides,
  });
}

/** Create a default RenderPerformanceModel */
export function createDefaultRenderPerformanceModel(
  overrides: Partial<RenderPerformanceModel> = {},
): RenderPerformanceModel {
  return safeDeepCopy({
    perfId: '',
    currentFps: DEFAULT_HIFI_TARGET_FPS,
    averageFps: DEFAULT_HIFI_TARGET_FPS,
    minFps: DEFAULT_HIFI_TARGET_FPS,
    maxFps: DEFAULT_HIFI_TARGET_FPS,
    frameTimeMs: 0,
    averageFrameTimeMs: 0,
    drawCallCount: 0,
    textureCount: 0,
    componentCount: 0,
    wireCount: 0,
    totalObjectCount: 0,
    gpuMemoryBytes: 0,
    lastUpdateTimestamp: 0,
    frameTimes: [],
    futurePerformanceHints: {},
    ...overrides,
  });
}

/** Create a default ViewportCullingModel */
export function createDefaultViewportCullingModel(
  overrides: Partial<ViewportCullingModel> = {},
): ViewportCullingModel {
  return safeDeepCopy({
    cullingId: '',
    cullingMode: 'VIEWPORT' as CullingMode,
    viewportX: 0,
    viewportY: 0,
    viewportWidth: 1920,
    viewportHeight: 1080,
    zoom: 1,
    marginPx: DEFAULT_HIFI_CULLING_MARGIN_PX,
    visibleObjectCount: 0,
    culledObjectCount: 0,
    totalObjectCount: 0,
    lastCullTimestamp: 0,
    futureCullingHints: {},
    ...overrides,
  });
}

/** Create a default ObjectPoolModel */
export function createDefaultObjectPoolModel(
  overrides: Partial<ObjectPoolModel> = {},
): ObjectPoolModel {
  return safeDeepCopy({
    poolId: '',
    objectType: '',
    poolSize: DEFAULT_HIFI_POOL_INITIAL_SIZE,
    activeCount: 0,
    availableCount: DEFAULT_HIFI_POOL_INITIAL_SIZE,
    highWatermark: 0,
    totalAllocations: 0,
    totalReleases: 0,
    futurePoolHints: {},
    ...overrides,
  });
}

/** Create a default DirtyRectModel */
export function createDefaultDirtyRectModel(
  overrides: Partial<DirtyRectModel> = {},
): DirtyRectModel {
  return safeDeepCopy({
    dirtyRectId: '',
    objectId: '',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    isDirty: false,
    frameMarked: 0,
    futureDirtyHints: {},
    ...overrides,
  });
}

/** Create a default SpatialIndexModel */
export function createDefaultSpatialIndexModel(
  overrides: Partial<SpatialIndexModel> = {},
): SpatialIndexModel {
  return safeDeepCopy({
    spatialId: '',
    cellSize: DEFAULT_HIFI_SPATIAL_CELL_SIZE,
    cellX: 0,
    cellY: 0,
    objectId: '',
    objectX: 0,
    objectY: 0,
    objectWidth: 0,
    objectHeight: 0,
    futureSpatialHints: {},
    ...overrides,
  });
}

/** Create a default RenderBatchModel */
export function createDefaultRenderBatchModel(
  overrides: Partial<RenderBatchModel> = {},
): RenderBatchModel {
  return safeDeepCopy({
    batchId: '',
    textureId: '',
    objectIds: [],
    objectCount: 0,
    drawCallIndex: 0,
    isOptimized: false,
    futureBatchHints: {},
    ...overrides,
  });
}

/** Create a default CadGridModel */
export function createDefaultCadGridModel(
  overrides: Partial<CadGridModel> = {},
): CadGridModel {
  return safeDeepCopy({
    cadGridId: '',
    gridStyle: 'CAD' as GridStyle,
    minorSpacing: DEFAULT_HIFI_MINOR_GRID_SIZE,
    majorSpacing: DEFAULT_HIFI_MAJOR_GRID_SIZE,
    snapSize: DEFAULT_HIFI_SNAP_SIZE,
    snapEnabled: true,
    visible: true,
    minorColor: DEFAULT_HIFI_MINOR_GRID_COLOR,
    majorColor: DEFAULT_HIFI_MAJOR_GRID_COLOR,
    minorAlpha: DEFAULT_HIFI_MINOR_GRID_ALPHA,
    majorAlpha: DEFAULT_HIFI_MAJOR_GRID_ALPHA,
    adaptiveZoom: true,
    currentZoom: 1,
    viewportX: 0,
    viewportY: 0,
    viewportWidth: 1920,
    viewportHeight: 1080,
    futureGridHints: {},
    ...overrides,
  });
}

/** Create a default DebugOverlayModel */
export function createDefaultDebugOverlayModel(
  overrides: Partial<DebugOverlayModel> = {},
): DebugOverlayModel {
  return safeDeepCopy({
    debugId: '',
    mode: 'OFF' as DebugOverlayMode,
    isVisible: false,
    positionX: 10,
    positionY: 10,
    currentFps: 0,
    drawCallCount: 0,
    textureCount: 0,
    componentCount: 0,
    wireCount: 0,
    culledCount: 0,
    memoryUsageBytes: 0,
    renderTimeMs: 0,
    lastUpdateTimestamp: 0,
    futureDebugHints: {},
    ...overrides,
  });
}

/** Create a default StartupSceneModel */
export function createDefaultStartupSceneModel(
  overrides: Partial<StartupSceneModel> = {},
): StartupSceneModel {
  return safeDeepCopy({
    sceneId: '',
    sceneName: 'Default Startup Scene',
    componentPlacements: [],
    wireConnections: [],
    cameraX: 0,
    cameraY: 0,
    cameraZoom: 1,
    gridVisible: true,
    futureSceneHints: {},
    ...overrides,
  });
}

/** Create a default PinRenderStateModel */
export function createDefaultPinRenderStateModel(
  overrides: Partial<PinRenderStateModel> = {},
): PinRenderStateModel {
  return safeDeepCopy({
    pinRenderId: '',
    pinId: '',
    componentId: '',
    isHovered: false,
    isSelected: false,
    isHighlighted: false,
    isCompatibleTarget: false,
    isInvalidTarget: false,
    netColor: 0x000000,
    highlightColor: DEFAULT_HIFI_PIN_HIGHLIGHT_COLOR,
    hoverRadius: DEFAULT_HIFI_PIN_HOVER_RADIUS,
    tooltipText: '',
    futurePinRenderHints: {},
    ...overrides,
  });
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3: MODEL VALIDATORS (14)
// ═══════════════════════════════════════════════════════════════

/** Validate a ComponentTextureModel — warning-only */
export function validateComponentTextureModel(model: ComponentTextureModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model.textureId) w.push({ code: 'HIFI_TEX_NO_ID', message: 'ComponentTextureModel missing textureId.' });
  if (!model.componentType) w.push({ code: 'HIFI_TEX_NO_TYPE', message: 'ComponentTextureModel missing componentType.' });
  if (model.naturalWidth < 0) w.push({ code: 'HIFI_TEX_NEG_W', message: 'ComponentTextureModel naturalWidth is negative.' });
  if (model.naturalHeight < 0) w.push({ code: 'HIFI_TEX_NEG_H', message: 'ComponentTextureModel naturalHeight is negative.' });
  if (model.scale <= 0) w.push({ code: 'HIFI_TEX_BAD_SCALE', message: 'ComponentTextureModel scale must be positive.' });
  if (!VALID_HIFI_TEXTURE_FORMATS.includes(model.textureFormat)) w.push({ code: 'HIFI_TEX_BAD_FORMAT', message: `Invalid textureFormat: ${model.textureFormat}` });
  if (!VALID_HIFI_TEXTURE_STATES.includes(model.textureState)) w.push({ code: 'HIFI_TEX_BAD_STATE', message: `Invalid textureState: ${model.textureState}` });
  return w;
}

/** Validate a TextureAtlasModel — warning-only */
export function validateTextureAtlasModel(model: TextureAtlasModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model.atlasId) w.push({ code: 'HIFI_ATLAS_NO_ID', message: 'TextureAtlasModel missing atlasId.' });
  if (model.width <= 0) w.push({ code: 'HIFI_ATLAS_BAD_W', message: 'TextureAtlasModel width must be positive.' });
  if (model.height <= 0) w.push({ code: 'HIFI_ATLAS_BAD_H', message: 'TextureAtlasModel height must be positive.' });
  if (!VALID_HIFI_TEXTURE_FORMATS.includes(model.format)) w.push({ code: 'HIFI_ATLAS_BAD_FMT', message: `Invalid atlas format: ${model.format}` });
  return w;
}

/** Validate a TextureCacheModel — warning-only */
export function validateTextureCacheModel(model: TextureCacheModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model.cacheId) w.push({ code: 'HIFI_CACHE_NO_ID', message: 'TextureCacheModel missing cacheId.' });
  if (!model.textureId) w.push({ code: 'HIFI_CACHE_NO_TEX', message: 'TextureCacheModel missing textureId.' });
  if (model.memorySizeBytes < 0) w.push({ code: 'HIFI_CACHE_NEG_MEM', message: 'TextureCacheModel memorySizeBytes is negative.' });
  if (model.accessCount < 0) w.push({ code: 'HIFI_CACHE_NEG_ACC', message: 'TextureCacheModel accessCount is negative.' });
  return w;
}

/** Validate a TextureMetadataModel — warning-only */
export function validateTextureMetadataModel(model: TextureMetadataModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model.metadataId) w.push({ code: 'HIFI_META_NO_ID', message: 'TextureMetadataModel missing metadataId.' });
  if (!model.textureId) w.push({ code: 'HIFI_META_NO_TEX', message: 'TextureMetadataModel missing textureId.' });
  if (model.resolution <= 0) w.push({ code: 'HIFI_META_BAD_RES', message: 'TextureMetadataModel resolution must be positive.' });
  if (model.mipmapLevels < 1) w.push({ code: 'HIFI_META_BAD_MIP', message: 'TextureMetadataModel mipmapLevels must be >= 1.' });
  return w;
}

/** Validate a RenderPerformanceModel — warning-only */
export function validateRenderPerformanceModel(model: RenderPerformanceModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model.perfId) w.push({ code: 'HIFI_PERF_NO_ID', message: 'RenderPerformanceModel missing perfId.' });
  if (model.currentFps < 0) w.push({ code: 'HIFI_PERF_NEG_FPS', message: 'RenderPerformanceModel currentFps is negative.' });
  if (model.drawCallCount < 0) w.push({ code: 'HIFI_PERF_NEG_DC', message: 'RenderPerformanceModel drawCallCount is negative.' });
  if (model.totalObjectCount < 0) w.push({ code: 'HIFI_PERF_NEG_OBJ', message: 'RenderPerformanceModel totalObjectCount is negative.' });
  return w;
}

/** Validate a ViewportCullingModel — warning-only */
export function validateViewportCullingModel(model: ViewportCullingModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model.cullingId) w.push({ code: 'HIFI_CULL_NO_ID', message: 'ViewportCullingModel missing cullingId.' });
  if (!VALID_HIFI_CULLING_MODES.includes(model.cullingMode)) w.push({ code: 'HIFI_CULL_BAD_MODE', message: `Invalid cullingMode: ${model.cullingMode}` });
  if (model.viewportWidth <= 0) w.push({ code: 'HIFI_CULL_BAD_W', message: 'ViewportCullingModel viewportWidth must be positive.' });
  if (model.viewportHeight <= 0) w.push({ code: 'HIFI_CULL_BAD_H', message: 'ViewportCullingModel viewportHeight must be positive.' });
  if (model.zoom <= 0) w.push({ code: 'HIFI_CULL_BAD_ZOOM', message: 'ViewportCullingModel zoom must be positive.' });
  return w;
}

/** Validate an ObjectPoolModel — warning-only */
export function validateObjectPoolModel(model: ObjectPoolModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model.poolId) w.push({ code: 'HIFI_POOL_NO_ID', message: 'ObjectPoolModel missing poolId.' });
  if (!model.objectType) w.push({ code: 'HIFI_POOL_NO_TYPE', message: 'ObjectPoolModel missing objectType.' });
  if (model.poolSize < 0) w.push({ code: 'HIFI_POOL_NEG_SIZE', message: 'ObjectPoolModel poolSize is negative.' });
  if (model.activeCount < 0) w.push({ code: 'HIFI_POOL_NEG_ACT', message: 'ObjectPoolModel activeCount is negative.' });
  if (model.activeCount > model.poolSize) w.push({ code: 'HIFI_POOL_OVERFLOW', message: 'ObjectPoolModel activeCount exceeds poolSize.' });
  return w;
}

/** Validate a DirtyRectModel — warning-only */
export function validateDirtyRectModel(model: DirtyRectModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model.dirtyRectId) w.push({ code: 'HIFI_DIRTY_NO_ID', message: 'DirtyRectModel missing dirtyRectId.' });
  if (model.width < 0) w.push({ code: 'HIFI_DIRTY_NEG_W', message: 'DirtyRectModel width is negative.' });
  if (model.height < 0) w.push({ code: 'HIFI_DIRTY_NEG_H', message: 'DirtyRectModel height is negative.' });
  return w;
}

/** Validate a SpatialIndexModel — warning-only */
export function validateSpatialIndexModel(model: SpatialIndexModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model.spatialId) w.push({ code: 'HIFI_SPATIAL_NO_ID', message: 'SpatialIndexModel missing spatialId.' });
  if (model.cellSize <= 0) w.push({ code: 'HIFI_SPATIAL_BAD_CELL', message: 'SpatialIndexModel cellSize must be positive.' });
  if (model.objectWidth < 0) w.push({ code: 'HIFI_SPATIAL_NEG_W', message: 'SpatialIndexModel objectWidth is negative.' });
  if (model.objectHeight < 0) w.push({ code: 'HIFI_SPATIAL_NEG_H', message: 'SpatialIndexModel objectHeight is negative.' });
  return w;
}

/** Validate a RenderBatchModel — warning-only */
export function validateRenderBatchModel(model: RenderBatchModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model.batchId) w.push({ code: 'HIFI_BATCH_NO_ID', message: 'RenderBatchModel missing batchId.' });
  if (!model.textureId) w.push({ code: 'HIFI_BATCH_NO_TEX', message: 'RenderBatchModel missing textureId.' });
  if (model.objectCount < 0) w.push({ code: 'HIFI_BATCH_NEG_CNT', message: 'RenderBatchModel objectCount is negative.' });
  if (model.objectIds.length !== model.objectCount) w.push({ code: 'HIFI_BATCH_MISMATCH', message: 'RenderBatchModel objectIds.length does not match objectCount.' });
  return w;
}

/** Validate a CadGridModel — warning-only */
export function validateCadGridModel(model: CadGridModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model.cadGridId) w.push({ code: 'HIFI_GRID_NO_ID', message: 'CadGridModel missing cadGridId.' });
  if (!VALID_HIFI_GRID_STYLES.includes(model.gridStyle)) w.push({ code: 'HIFI_GRID_BAD_STYLE', message: `Invalid gridStyle: ${model.gridStyle}` });
  if (model.minorSpacing <= 0) w.push({ code: 'HIFI_GRID_BAD_MINOR', message: 'CadGridModel minorSpacing must be positive.' });
  if (model.majorSpacing <= 0) w.push({ code: 'HIFI_GRID_BAD_MAJOR', message: 'CadGridModel majorSpacing must be positive.' });
  if (model.snapSize <= 0) w.push({ code: 'HIFI_GRID_BAD_SNAP', message: 'CadGridModel snapSize must be positive.' });
  return w;
}

/** Validate a DebugOverlayModel — warning-only */
export function validateDebugOverlayModel(model: DebugOverlayModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model.debugId) w.push({ code: 'HIFI_DEBUG_NO_ID', message: 'DebugOverlayModel missing debugId.' });
  if (!VALID_HIFI_DEBUG_OVERLAY_MODES.includes(model.mode)) w.push({ code: 'HIFI_DEBUG_BAD_MODE', message: `Invalid debug mode: ${model.mode}` });
  if (model.currentFps < 0) w.push({ code: 'HIFI_DEBUG_NEG_FPS', message: 'DebugOverlayModel currentFps is negative.' });
  return w;
}

/** Validate a StartupSceneModel — warning-only */
export function validateStartupSceneModel(model: StartupSceneModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model.sceneId) w.push({ code: 'HIFI_SCENE_NO_ID', message: 'StartupSceneModel missing sceneId.' });
  if (!model.sceneName) w.push({ code: 'HIFI_SCENE_NO_NAME', message: 'StartupSceneModel missing sceneName.' });
  if (model.cameraZoom <= 0) w.push({ code: 'HIFI_SCENE_BAD_ZOOM', message: 'StartupSceneModel cameraZoom must be positive.' });
  for (let i = 0; i < model.componentPlacements.length; i++) {
    const p = model.componentPlacements[i];
    if (!p.assetId) w.push({ code: 'HIFI_SCENE_NO_ASSET', message: `componentPlacements[${i}] missing assetId.` });
  }
  return w;
}

/** Validate a PinRenderStateModel — warning-only */
export function validatePinRenderStateModel(model: PinRenderStateModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model.pinRenderId) w.push({ code: 'HIFI_PIN_NO_ID', message: 'PinRenderStateModel missing pinRenderId.' });
  if (!model.pinId) w.push({ code: 'HIFI_PIN_NO_PIN', message: 'PinRenderStateModel missing pinId.' });
  if (!model.componentId) w.push({ code: 'HIFI_PIN_NO_COMP', message: 'PinRenderStateModel missing componentId.' });
  if (model.hoverRadius < 0) w.push({ code: 'HIFI_PIN_NEG_RAD', message: 'PinRenderStateModel hoverRadius is negative.' });
  return w;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4: DUPLICATE ID VALIDATORS (14)
// ═══════════════════════════════════════════════════════════════

/** Validate no duplicate textureId values */
export function validateDuplicateComponentTextureIds(models: ComponentTextureModel[]): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.textureId)) w.push({ code: 'HIFI_DUP_TEX_ID', message: `Duplicate textureId: ${m.textureId}` });
    seen.add(m.textureId);
  }
  return w;
}

/** Validate no duplicate atlasId values */
export function validateDuplicateTextureAtlasIds(models: TextureAtlasModel[]): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.atlasId)) w.push({ code: 'HIFI_DUP_ATLAS_ID', message: `Duplicate atlasId: ${m.atlasId}` });
    seen.add(m.atlasId);
  }
  return w;
}

/** Validate no duplicate cacheId values */
export function validateDuplicateTextureCacheIds(models: TextureCacheModel[]): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.cacheId)) w.push({ code: 'HIFI_DUP_CACHE_ID', message: `Duplicate cacheId: ${m.cacheId}` });
    seen.add(m.cacheId);
  }
  return w;
}

/** Validate no duplicate metadataId values */
export function validateDuplicateTextureMetadataIds(models: TextureMetadataModel[]): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.metadataId)) w.push({ code: 'HIFI_DUP_META_ID', message: `Duplicate metadataId: ${m.metadataId}` });
    seen.add(m.metadataId);
  }
  return w;
}

/** Validate no duplicate perfId values */
export function validateDuplicateRenderPerformanceIds(models: RenderPerformanceModel[]): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.perfId)) w.push({ code: 'HIFI_DUP_PERF_ID', message: `Duplicate perfId: ${m.perfId}` });
    seen.add(m.perfId);
  }
  return w;
}

/** Validate no duplicate cullingId values */
export function validateDuplicateViewportCullingIds(models: ViewportCullingModel[]): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.cullingId)) w.push({ code: 'HIFI_DUP_CULL_ID', message: `Duplicate cullingId: ${m.cullingId}` });
    seen.add(m.cullingId);
  }
  return w;
}

/** Validate no duplicate poolId values */
export function validateDuplicateObjectPoolIds(models: ObjectPoolModel[]): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.poolId)) w.push({ code: 'HIFI_DUP_POOL_ID', message: `Duplicate poolId: ${m.poolId}` });
    seen.add(m.poolId);
  }
  return w;
}

/** Validate no duplicate dirtyRectId values */
export function validateDuplicateDirtyRectIds(models: DirtyRectModel[]): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.dirtyRectId)) w.push({ code: 'HIFI_DUP_DIRTY_ID', message: `Duplicate dirtyRectId: ${m.dirtyRectId}` });
    seen.add(m.dirtyRectId);
  }
  return w;
}

/** Validate no duplicate spatialId values */
export function validateDuplicateSpatialIndexIds(models: SpatialIndexModel[]): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.spatialId)) w.push({ code: 'HIFI_DUP_SPATIAL_ID', message: `Duplicate spatialId: ${m.spatialId}` });
    seen.add(m.spatialId);
  }
  return w;
}

/** Validate no duplicate batchId values */
export function validateDuplicateRenderBatchIds(models: RenderBatchModel[]): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.batchId)) w.push({ code: 'HIFI_DUP_BATCH_ID', message: `Duplicate batchId: ${m.batchId}` });
    seen.add(m.batchId);
  }
  return w;
}

/** Validate no duplicate cadGridId values */
export function validateDuplicateCadGridIds(models: CadGridModel[]): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.cadGridId)) w.push({ code: 'HIFI_DUP_GRID_ID', message: `Duplicate cadGridId: ${m.cadGridId}` });
    seen.add(m.cadGridId);
  }
  return w;
}

/** Validate no duplicate debugId values */
export function validateDuplicateDebugOverlayIds(models: DebugOverlayModel[]): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.debugId)) w.push({ code: 'HIFI_DUP_DEBUG_ID', message: `Duplicate debugId: ${m.debugId}` });
    seen.add(m.debugId);
  }
  return w;
}

/** Validate no duplicate sceneId values */
export function validateDuplicateStartupSceneIds(models: StartupSceneModel[]): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.sceneId)) w.push({ code: 'HIFI_DUP_SCENE_ID', message: `Duplicate sceneId: ${m.sceneId}` });
    seen.add(m.sceneId);
  }
  return w;
}

/** Validate no duplicate pinRenderId values */
export function validateDuplicatePinRenderStateIds(models: PinRenderStateModel[]): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.pinRenderId)) w.push({ code: 'HIFI_DUP_PIN_ID', message: `Duplicate pinRenderId: ${m.pinRenderId}` });
    seen.add(m.pinRenderId);
  }
  return w;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5: TEXTURE MANAGEMENT ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Create a texture entry for a component.
 * @param assetId - the component asset identifier
 * @param format - texture format
 * @param svgData - optional inline SVG data URI
 * @param url - optional external URL
 */
export function createTextureEntry(
  assetId: string,
  format: TextureFormat,
  svgData?: string,
  url?: string,
): ComponentTextureModel {
  return createDefaultComponentTextureModel({
    textureId: `tex_${assetId}`,
    assetId,
    textureFormat: format,
    textureState: svgData || url ? 'LOADED' : 'UNLOADED',
    assetPath: url || '',
    svgData: svgData || '',
  });
}

/**
 * Resolve the texture source for a given texture model.
 * Returns the type and source string.
 */
export function resolveTextureSource(
  texture: ComponentTextureModel,
): { type: 'SVG_DATA' | 'URL' | 'NONE'; source: string } {
  if (texture.svgData && texture.svgData.length > 0) {
    return { type: 'SVG_DATA', source: texture.svgData };
  }
  if (texture.assetPath && texture.assetPath.length > 0) {
    return { type: 'URL', source: texture.assetPath };
  }
  return { type: 'NONE', source: '' };
}

/**
 * Calculate the memory usage of a texture in bytes.
 * Assumes 4 bytes per pixel (RGBA).
 */
export function calculateTextureMemory(
  width: number,
  height: number,
  _format: TextureFormat,
): number {
  if (width <= 0 || height <= 0) return 0;
  return width * height * 4;
}

/**
 * Determine whether a texture should be evicted from cache
 * based on total memory usage.
 */
export function shouldEvictTexture(
  cache: TextureCacheModel,
  maxMemoryBytes: number,
): boolean {
  return cache.memorySizeBytes > maxMemoryBytes;
}

/**
 * Evict the least recently accessed texture from the cache array.
 * Returns the evicted cacheId, or empty string if none.
 */
export function evictLeastRecentTexture(
  caches: TextureCacheModel[],
): string {
  if (caches.length === 0) return '';
  let oldest = caches[0];
  for (let i = 1; i < caches.length; i++) {
    if (caches[i].lastAccessTimestamp < oldest.lastAccessTimestamp) {
      oldest = caches[i];
    }
  }
  return oldest.cacheId;
}

/**
 * Build a texture atlas from a set of textures.
 * Simple row packing algorithm.
 */
export function buildTextureAtlas(
  textures: ComponentTextureModel[],
  maxAtlasSize: number,
): TextureAtlasModel {
  let currentX = 0;
  let currentY = 0;
  let rowHeight = 0;
  let atlasWidth = 0;
  const regions: { textureId: string; x: number; y: number; width: number; height: number }[] = [];
  const textureIds: string[] = [];

  for (const tex of textures) {
    const tw = tex.naturalWidth || 64;
    const th = tex.naturalHeight || 64;

    if (currentX + tw > maxAtlasSize) {
      currentX = 0;
      currentY += rowHeight;
      rowHeight = 0;
    }

    regions.push({
      textureId: tex.textureId,
      x: currentX,
      y: currentY,
      width: tw,
      height: th,
    });
    textureIds.push(tex.textureId);

    currentX += tw;
    if (tw > atlasWidth) atlasWidth = tw;
    if (currentX > atlasWidth) atlasWidth = currentX;
    if (th > rowHeight) rowHeight = th;
  }

  const atlasHeight = currentY + rowHeight;

  return createDefaultTextureAtlasModel({
    atlasId: `atlas_auto_${textures.length}`,
    atlasName: 'Auto-generated Atlas',
    width: Math.min(atlasWidth, maxAtlasSize),
    height: atlasHeight,
    textureIds,
    regions,
    memoryBytes: calculateTextureMemory(atlasWidth, atlasHeight, 'PNG'),
  });
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6: VIEWPORT CULLING ENGINE
// ═══════════════════════════════════════════════════════════════

/** Bounds rectangle interface for culling operations */
export interface HifiBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Check whether an object's bounding box overlaps the viewport */
export function isObjectInViewport(
  objectBounds: HifiBounds,
  viewportBounds: HifiBounds,
): boolean {
  return !(
    objectBounds.x + objectBounds.width < viewportBounds.x ||
    objectBounds.x > viewportBounds.x + viewportBounds.width ||
    objectBounds.y + objectBounds.height < viewportBounds.y ||
    objectBounds.y > viewportBounds.y + viewportBounds.height
  );
}

/** Cull an array of objects, returning visible and culled arrays */
export function cullObjects<T extends { x: number; y: number; width: number; height: number }>(
  objects: T[],
  viewportBounds: HifiBounds,
): { visible: T[]; culled: T[] } {
  const visible: T[] = [];
  const culled: T[] = [];
  for (const obj of objects) {
    if (isObjectInViewport(obj, viewportBounds)) {
      visible.push(obj);
    } else {
      culled.push(obj);
    }
  }
  return { visible, culled };
}

/** Calculate the viewport bounds from camera position and zoom */
export function calculateViewportBounds(
  cameraX: number,
  cameraY: number,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number,
): HifiBounds {
  const effectiveZoom = zoom > 0 ? zoom : 1;
  const w = viewportWidth / effectiveZoom;
  const h = viewportHeight / effectiveZoom;
  return {
    x: cameraX - w / 2,
    y: cameraY - h / 2,
    width: w,
    height: h,
  };
}

/** Expand viewport bounds by a margin (in pixels) for pre-loading */
export function expandViewportMargin(
  bounds: HifiBounds,
  marginPx: number,
): HifiBounds {
  return {
    x: bounds.x - marginPx,
    y: bounds.y - marginPx,
    width: bounds.width + marginPx * 2,
    height: bounds.height + marginPx * 2,
  };
}

/** Update culling state with visible/culled counts */
export function updateCullingState(
  culling: ViewportCullingModel,
  visibleCount: number,
  culledCount: number,
  timestamp: number,
): ViewportCullingModel {
  return safeDeepCopy({
    ...culling,
    visibleObjectCount: visibleCount,
    culledObjectCount: culledCount,
    totalObjectCount: visibleCount + culledCount,
    lastCullTimestamp: timestamp,
  });
}

// ═══════════════════════════════════════════════════════════════
// SECTION 7: OBJECT POOLING ENGINE
// ═══════════════════════════════════════════════════════════════

/** Create a new object pool */
export function createPool(
  poolId: string,
  objectType: string,
  initialSize: number,
): ObjectPoolModel {
  return createDefaultObjectPoolModel({
    poolId,
    objectType,
    poolSize: initialSize,
    activeCount: 0,
    availableCount: initialSize,
    highWatermark: 0,
  });
}

/**
 * Acquire an object from the pool.
 * Returns the new pool state with updated counts.
 * Returns null if pool is exhausted.
 */
export function acquireFromPool(
  pool: ObjectPoolModel,
): ObjectPoolModel | null {
  if (pool.availableCount <= 0) return null;
  const newActive = pool.activeCount + 1;
  return safeDeepCopy({
    ...pool,
    activeCount: newActive,
    availableCount: pool.availableCount - 1,
    highWatermark: Math.max(pool.highWatermark, newActive),
    totalAllocations: pool.totalAllocations + 1,
  });
}

/**
 * Release an object back to the pool.
 * Returns the new pool state with updated counts.
 * Returns null if pool has no active objects.
 */
export function releaseToPool(
  pool: ObjectPoolModel,
): ObjectPoolModel | null {
  if (pool.activeCount <= 0) return null;
  return safeDeepCopy({
    ...pool,
    activeCount: pool.activeCount - 1,
    availableCount: pool.availableCount + 1,
    totalReleases: pool.totalReleases + 1,
  });
}

/** Get pool utilization statistics */
export function getPoolStats(
  pool: ObjectPoolModel,
): { utilization: number; highWatermark: number; totalAllocations: number; totalReleases: number } {
  return {
    utilization: pool.poolSize > 0 ? pool.activeCount / pool.poolSize : 0,
    highWatermark: pool.highWatermark,
    totalAllocations: pool.totalAllocations,
    totalReleases: pool.totalReleases,
  };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 8: DIRTY RECTANGLE ENGINE
// ═══════════════════════════════════════════════════════════════

/** Mark a region as dirty for re-rendering */
export function markDirty(
  objectId: string,
  x: number,
  y: number,
  width: number,
  height: number,
  frame: number,
): DirtyRectModel {
  return createDefaultDirtyRectModel({
    dirtyRectId: `dirty_${objectId}_${frame}`,
    objectId,
    x,
    y,
    width,
    height,
    isDirty: true,
    frameMarked: frame,
  });
}

/**
 * Merge overlapping dirty rectangles into fewer, larger rectangles.
 * Uses a simple union approach — merges any pair that overlaps.
 */
export function mergeDirtyRects(
  rects: DirtyRectModel[],
): DirtyRectModel[] {
  if (rects.length <= 1) return safeDeepCopy(rects);

  const merged: DirtyRectModel[] = [];
  const used = new Set<number>();

  for (let i = 0; i < rects.length; i++) {
    if (used.has(i)) continue;

    let current = safeDeepCopy(rects[i]);
    used.add(i);

    for (let j = i + 1; j < rects.length; j++) {
      if (used.has(j)) continue;

      const other = rects[j];
      // Check overlap
      if (
        current.x < other.x + other.width &&
        current.x + current.width > other.x &&
        current.y < other.y + other.height &&
        current.y + current.height > other.y
      ) {
        // Union
        const newX = Math.min(current.x, other.x);
        const newY = Math.min(current.y, other.y);
        const newRight = Math.max(current.x + current.width, other.x + other.width);
        const newBottom = Math.max(current.y + current.height, other.y + other.height);
        current.x = newX;
        current.y = newY;
        current.width = newRight - newX;
        current.height = newBottom - newY;
        used.add(j);
      }
    }

    merged.push(current);
  }

  return merged;
}

/** Check if a specific object has a dirty rect */
export function isDirty(
  objectId: string,
  rects: DirtyRectModel[],
): boolean {
  return rects.some(r => r.objectId === objectId && r.isDirty);
}

/** Clear all dirty rectangles (mark as not dirty) */
export function clearDirtyRects(
  rects: DirtyRectModel[],
): DirtyRectModel[] {
  return rects.map(r => safeDeepCopy({ ...r, isDirty: false }));
}

// ═══════════════════════════════════════════════════════════════
// SECTION 9: SPATIAL INDEXING ENGINE
// ═══════════════════════════════════════════════════════════════

/** Create an empty spatial index configuration */
export function createSpatialIndex(
  cellSize: number,
): SpatialIndexModel {
  return createDefaultSpatialIndexModel({
    spatialId: `spatial_root`,
    cellSize: cellSize > 0 ? cellSize : DEFAULT_HIFI_SPATIAL_CELL_SIZE,
  });
}

/** Insert an object into a spatial index, returning the index entry */
export function insertIntoSpatialIndex(
  cellSize: number,
  objectId: string,
  objectX: number,
  objectY: number,
  objectWidth: number,
  objectHeight: number,
): SpatialIndexModel {
  const cellX = Math.floor(objectX / cellSize);
  const cellY = Math.floor(objectY / cellSize);
  return createDefaultSpatialIndexModel({
    spatialId: `spatial_${objectId}`,
    cellSize,
    cellX,
    cellY,
    objectId,
    objectX,
    objectY,
    objectWidth,
    objectHeight,
  });
}

/** Remove an object from the spatial index array */
export function removeFromSpatialIndex(
  indices: SpatialIndexModel[],
  objectId: string,
): SpatialIndexModel[] {
  return indices.filter(idx => idx.objectId !== objectId);
}

/** Query all objects within a region */
export function queryRegion(
  indices: SpatialIndexModel[],
  queryBounds: HifiBounds,
): string[] {
  const result: string[] = [];
  for (const idx of indices) {
    if (
      isObjectInViewport(
        { x: idx.objectX, y: idx.objectY, width: idx.objectWidth, height: idx.objectHeight },
        queryBounds,
      )
    ) {
      result.push(idx.objectId);
    }
  }
  return result;
}

/** Rebuild the entire spatial index from scratch */
export function rebuildSpatialIndex(
  cellSize: number,
  allObjects: { objectId: string; x: number; y: number; width: number; height: number }[],
): SpatialIndexModel[] {
  return allObjects.map(obj =>
    insertIntoSpatialIndex(cellSize, obj.objectId, obj.x, obj.y, obj.width, obj.height),
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 10: RENDER BATCHING ENGINE
// ═══════════════════════════════════════════════════════════════

/** Create a render batch for a single texture */
export function createRenderBatch(
  textureId: string,
  objectIds: string[],
): RenderBatchModel {
  return createDefaultRenderBatchModel({
    batchId: `batch_${textureId}_${objectIds.length}`,
    textureId,
    objectIds: [...objectIds],
    objectCount: objectIds.length,
    isOptimized: false,
  });
}

/** Sort objects into batches grouped by texture ID */
export function sortIntoBatches<T extends { objectId: string }>(
  objects: T[],
  getTextureId: (obj: T) => string,
): RenderBatchModel[] {
  const groups = new Map<string, string[]>();
  for (const obj of objects) {
    const texId = getTextureId(obj);
    const existing = groups.get(texId);
    if (existing) {
      existing.push(obj.objectId);
    } else {
      groups.set(texId, [obj.objectId]);
    }
  }

  const batches: RenderBatchModel[] = [];
  let idx = 0;
  for (const [texId, ids] of groups) {
    batches.push(createDefaultRenderBatchModel({
      batchId: `batch_${texId}_${idx}`,
      textureId: texId,
      objectIds: ids,
      objectCount: ids.length,
      drawCallIndex: idx,
      isOptimized: true,
    }));
    idx++;
  }
  return batches;
}

/** Get batch statistics */
export function getBatchStats(
  batches: RenderBatchModel[],
): { totalBatches: number; totalObjects: number; avgBatchSize: number } {
  const totalBatches = batches.length;
  const totalObjects = batches.reduce((sum, b) => sum + b.objectCount, 0);
  return {
    totalBatches,
    totalObjects,
    avgBatchSize: totalBatches > 0 ? totalObjects / totalBatches : 0,
  };
}

/** Optimize batch order to minimize texture state changes */
export function optimizeBatchOrder(
  batches: RenderBatchModel[],
): RenderBatchModel[] {
  // Sort by textureId to group same-texture batches together,
  // then by object count descending for optimal GPU utilization.
  const sorted = [...batches].sort((a, b) => {
    const texCmp = a.textureId.localeCompare(b.textureId);
    if (texCmp !== 0) return texCmp;
    return b.objectCount - a.objectCount;
  });
  return sorted.map((batch, idx) =>
    safeDeepCopy({ ...batch, drawCallIndex: idx, isOptimized: true }),
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 11: CAD GRID ENGINE
// ═══════════════════════════════════════════════════════════════

/** Create a CAD grid for the given viewport dimensions */
export function createCadGrid(
  viewportWidth: number,
  viewportHeight: number,
): CadGridModel {
  return createDefaultCadGridModel({
    cadGridId: 'cad_grid_main',
    viewportWidth,
    viewportHeight,
  });
}

/** Calculate adaptive grid spacing based on current zoom level */
export function calculateAdaptiveGridSpacing(
  zoom: number,
  baseMinorSize: number,
  baseMajorSize: number,
): { minor: number; major: number } {
  const effectiveZoom = zoom > 0 ? zoom : 1;
  // Scale grid spacing inversely with zoom so grid looks consistent
  let minor = baseMinorSize;
  let major = baseMajorSize;

  if (effectiveZoom < 0.3) {
    minor = baseMinorSize * 5;
    major = baseMajorSize * 5;
  } else if (effectiveZoom < 0.6) {
    minor = baseMinorSize * 2;
    major = baseMajorSize * 2;
  } else if (effectiveZoom > 3) {
    minor = baseMinorSize / 2;
    major = baseMajorSize / 2;
  } else if (effectiveZoom > 6) {
    minor = baseMinorSize / 5;
    major = baseMajorSize / 5;
  }

  return {
    minor: Math.max(1, minor),
    major: Math.max(minor + 1, major),
  };
}

/** Grid line definition for rendering */
export interface HifiGridLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Generate grid lines for the current viewport */
export function generateGridLines(
  grid: CadGridModel,
  viewportBounds: HifiBounds,
  zoom: number,
): { minor: HifiGridLine[]; major: HifiGridLine[] } {
  const { minor: minorSpacing, major: majorSpacing } = calculateAdaptiveGridSpacing(
    zoom,
    grid.minorSpacing,
    grid.majorSpacing,
  );

  const minorLines: HifiGridLine[] = [];
  const majorLines: HifiGridLine[] = [];

  const startX = Math.floor(viewportBounds.x / minorSpacing) * minorSpacing;
  const endX = viewportBounds.x + viewportBounds.width;
  const startY = Math.floor(viewportBounds.y / minorSpacing) * minorSpacing;
  const endY = viewportBounds.y + viewportBounds.height;

  // Vertical lines
  for (let x = startX; x <= endX; x += minorSpacing) {
    const isMajor = Math.abs(x % majorSpacing) < 0.001;
    const line: HifiGridLine = { x1: x, y1: viewportBounds.y, x2: x, y2: endY };
    if (isMajor) {
      majorLines.push(line);
    } else {
      minorLines.push(line);
    }
  }

  // Horizontal lines
  for (let y = startY; y <= endY; y += minorSpacing) {
    const isMajor = Math.abs(y % majorSpacing) < 0.001;
    const line: HifiGridLine = { x1: viewportBounds.x, y1: y, x2: endX, y2: y };
    if (isMajor) {
      majorLines.push(line);
    } else {
      minorLines.push(line);
    }
  }

  return { minor: minorLines, major: majorLines };
}

/** Snap coordinates to the nearest grid point (HiFi renderer variant) */
export function hifiSnapToGrid(
  x: number,
  y: number,
  snapSize: number,
): { x: number; y: number } {
  const effectiveSnap = snapSize > 0 ? snapSize : DEFAULT_HIFI_SNAP_SIZE;
  return {
    x: Math.round(x / effectiveSnap) * effectiveSnap,
    y: Math.round(y / effectiveSnap) * effectiveSnap,
  };
}

/** Check if grid snapping is enabled */
export function isSnapEnabled(grid: CadGridModel): boolean {
  return grid.snapEnabled && grid.snapSize > 0;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 12: DEBUG OVERLAY ENGINE
// ═══════════════════════════════════════════════════════════════

/** Create a debug overlay model */
export function createDebugOverlay(
  mode: DebugOverlayMode,
): DebugOverlayModel {
  return createDefaultDebugOverlayModel({
    debugId: 'debug_overlay_main',
    mode,
    isVisible: mode !== 'OFF',
  });
}

/** Update performance metrics from frame data */
export function updatePerformanceMetrics(
  perf: RenderPerformanceModel,
  deltaMs: number,
  drawCalls: number,
  textureCount: number,
  timestamp: number,
): RenderPerformanceModel {
  const currentFps = deltaMs > 0 ? 1000 / deltaMs : 0;
  const newFrameTimes = [...perf.frameTimes, deltaMs];
  if (newFrameTimes.length > DEFAULT_HIFI_FPS_WINDOW_SIZE) {
    newFrameTimes.shift();
  }
  const avgFrameTime = newFrameTimes.length > 0
    ? newFrameTimes.reduce((a, b) => a + b, 0) / newFrameTimes.length
    : 0;
  const avgFps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;

  return safeDeepCopy({
    ...perf,
    currentFps,
    averageFps: avgFps,
    minFps: Math.min(perf.minFps, currentFps),
    maxFps: Math.max(perf.maxFps, currentFps),
    frameTimeMs: deltaMs,
    averageFrameTimeMs: avgFrameTime,
    drawCallCount: drawCalls,
    textureCount,
    lastUpdateTimestamp: timestamp,
    frameTimes: newFrameTimes,
  });
}

/** Calculate FPS from an array of frame times */
export function calculateFPS(
  frameTimes: number[],
  windowSize: number,
): number {
  if (frameTimes.length === 0) return 0;
  const window = frameTimes.slice(-Math.max(1, windowSize));
  const avgMs = window.reduce((a, b) => a + b, 0) / window.length;
  return avgMs > 0 ? 1000 / avgMs : 0;
}

/** Format debug statistics as display strings */
export function formatDebugStats(
  overlay: DebugOverlayModel,
): string[] {
  const lines: string[] = [];
  if (overlay.mode === 'OFF') return lines;

  lines.push(`FPS: ${overlay.currentFps.toFixed(1)}`);

  if (overlay.mode === 'RENDER_STATS' || overlay.mode === 'FULL') {
    lines.push(`Draw Calls: ${overlay.drawCallCount}`);
    lines.push(`Textures: ${overlay.textureCount}`);
    lines.push(`Components: ${overlay.componentCount}`);
    lines.push(`Wires: ${overlay.wireCount}`);
  }

  if (overlay.mode === 'FULL') {
    lines.push(`Culled: ${overlay.culledCount}`);
    lines.push(`Memory: ${(overlay.memoryUsageBytes / 1024 / 1024).toFixed(1)} MB`);
    lines.push(`Render: ${overlay.renderTimeMs.toFixed(2)} ms`);
  }

  return lines;
}

/** Toggle debug overlay mode */
export function toggleDebugMode(
  overlay: DebugOverlayModel,
  mode: DebugOverlayMode,
): DebugOverlayModel {
  return safeDeepCopy({
    ...overlay,
    mode,
    isVisible: mode !== 'OFF',
  });
}

// ═══════════════════════════════════════════════════════════════
// SECTION 13: STARTUP SCENE ENGINE
// ═══════════════════════════════════════════════════════════════

/** Create a default startup scene with ESP32, Breadboard, LED, Resistor */
export function createDefaultStartupScene(): StartupSceneModel {
  return createDefaultStartupSceneModel({
    sceneId: 'startup_default',
    sceneName: 'Default Electronics Workbench',
    componentPlacements: [
      { assetId: 'esp32_devkit_v1', x: 200, y: 100, rotation: 0, scale: 1 },
      { assetId: 'breadboard_830', x: 200, y: 300, rotation: 0, scale: 1 },
      { assetId: 'led_5mm', x: 400, y: 100, rotation: 0, scale: 1 },
      { assetId: 'resistor_220', x: 400, y: 200, rotation: 0, scale: 1 },
    ],
    wireConnections: [],
    cameraX: 400,
    cameraY: 250,
    cameraZoom: 1,
    gridVisible: true,
  });
}

/** Calculate layout positions for startup scene components */
export function calculateStartupLayout(
  components: { assetId: string; width: number; height: number }[],
): { assetId: string; x: number; y: number; rotation: number; scale: number }[] {
  const padding = 40;
  let currentX = padding;
  let currentY = padding;
  let rowMaxHeight = 0;
  const maxRowWidth = 1200;

  return components.map(comp => {
    if (currentX + comp.width > maxRowWidth) {
      currentX = padding;
      currentY += rowMaxHeight + padding;
      rowMaxHeight = 0;
    }

    const placement = {
      assetId: comp.assetId,
      x: currentX,
      y: currentY,
      rotation: 0,
      scale: 1,
    };

    currentX += comp.width + padding;
    if (comp.height > rowMaxHeight) rowMaxHeight = comp.height;

    return placement;
  });
}

/** Validate a startup scene for common issues */
export function validateStartupScene(
  scene: StartupSceneModel,
): string[] {
  const warnings: string[] = [];

  if (scene.componentPlacements.length === 0) {
    warnings.push('Startup scene has no component placements.');
  }

  // Check for overlapping components (simple bounding-box check)
  for (let i = 0; i < scene.componentPlacements.length; i++) {
    const a = scene.componentPlacements[i];
    if (!a.assetId) {
      warnings.push(`Component placement [${i}] has no assetId.`);
    }
    for (let j = i + 1; j < scene.componentPlacements.length; j++) {
      const b = scene.componentPlacements[j];
      if (a.x === b.x && a.y === b.y) {
        warnings.push(`Components [${i}] and [${j}] are at the same position (${a.x}, ${a.y}).`);
      }
    }
  }

  if (scene.cameraZoom <= 0) {
    warnings.push('Startup scene cameraZoom must be positive.');
  }

  return warnings;
}

/** Get the list of components used in the default startup scene */
export function getStartupComponentList(): { assetId: string; componentType: string }[] {
  return [
    { assetId: 'esp32_devkit_v1', componentType: 'ESP32' },
    { assetId: 'breadboard_830', componentType: 'BREADBOARD' },
    { assetId: 'led_5mm', componentType: 'LED' },
    { assetId: 'resistor_220', componentType: 'RESISTOR' },
  ];
}

// ═══════════════════════════════════════════════════════════════
// SECTION 14: PIN RENDER ENGINE
// ═══════════════════════════════════════════════════════════════

/** Create a pin render state for a specific pin */
export function createPinRenderState(
  pinId: string,
  componentId: string,
): PinRenderStateModel {
  return createDefaultPinRenderStateModel({
    pinRenderId: `pr_${pinId}_${componentId}`,
    pinId,
    componentId,
  });
}

/** Highlight pins that are compatible wiring targets */
export function highlightCompatiblePins(
  sourcePinId: string,
  allPins: PinRenderStateModel[],
  connectedPinIds: string[],
): string[] {
  const compatibleIds: string[] = [];
  const connectedSet = new Set(connectedPinIds);
  for (const pin of allPins) {
    if (pin.pinId === sourcePinId) continue;
    if (connectedSet.has(pin.pinId)) continue;
    compatibleIds.push(pin.pinId);
  }
  return compatibleIds;
}

/** Update pin hover state */
export function updatePinHoverState(
  pin: PinRenderStateModel,
  isHovered: boolean,
): PinRenderStateModel {
  return safeDeepCopy({
    ...pin,
    isHovered,
  });
}

/** Update pin selection state */
export function updatePinSelectionState(
  pin: PinRenderStateModel,
  isSelected: boolean,
): PinRenderStateModel {
  return safeDeepCopy({
    ...pin,
    isSelected,
  });
}

/** Get pin net color based on electrical net membership */
export function getPinNetColor(
  pinId: string,
  electricalNets: { netId: string; pinIds: string[]; color: number }[],
): number {
  for (const net of electricalNets) {
    if (net.pinIds.includes(pinId)) {
      return net.color;
    }
  }
  return 0x888888; // Default gray for unconnected pins
}

// ═══════════════════════════════════════════════════════════════
// SECTION 15: SVG ASSET GENERATOR (stubs — real SVGs in
// component-svg-assets.ts)
// ═══════════════════════════════════════════════════════════════

const PLACEHOLDER_SVG = 'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#ccc"/><text x="50" y="55" text-anchor="middle" font-size="10" fill="#666">Component</text></svg>');

/** Generate a placeholder SVG data URI for a component type */
export function generateComponentSvgData(componentType: string): string {
  return PLACEHOLDER_SVG.replace('Component', componentType || 'Unknown');
}

/** Generate a placeholder SVG data URI for a breadboard */
export function generateBreadboardSvgData(assetId: string): string {
  return PLACEHOLDER_SVG.replace('Component', assetId || 'Breadboard');
}

/** Get all component SVG assets as a Map (HiFi renderer placeholder variant) */
export function hifiGetAllComponentSvgAssets(): Map<string, string> {
  const componentTypes = [
    'ESP32', 'ARDUINO_UNO', 'ARDUINO_NANO', 'HC_SR04', 'SG90_SERVO',
    'LED_5MM', 'RESISTOR', 'LCD1602', 'OLED_SSD1306', 'RELAY_MODULE',
    'BREADBOARD_830', 'BREADBOARD_400', 'BREADBOARD_MINI',
  ];
  const map = new Map<string, string>();
  for (const ct of componentTypes) {
    map.set(ct, generateComponentSvgData(ct));
  }
  return map;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 16: WIRE RENDERING UPGRADE ENGINE
// ═══════════════════════════════════════════════════════════════

/** Bezier control point result */
export interface HifiBezierControlPoints {
  cp1x: number;
  cp1y: number;
  cp2x: number;
  cp2y: number;
}

/** Calculate Bezier control points for smooth wire curves */
export function calculateBezierControlPoints(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): HifiBezierControlPoints {
  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offset = Math.min(dist * 0.4, 150);

  // Horizontal emphasis: control points push horizontally
  return {
    cp1x: startX + offset,
    cp1y: startY,
    cp2x: endX - offset,
    cp2y: endY,
  };
}

/** Orthogonal path segment */
export interface HifiPathSegment {
  x: number;
  y: number;
}

/** Calculate an orthogonal (right-angle) wire path */
export function calculateOrthogonalPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): HifiPathSegment[] {
  const midX = (startX + endX) / 2;
  return [
    { x: startX, y: startY },
    { x: midX, y: startY },
    { x: midX, y: endY },
    { x: endX, y: endY },
  ];
}

/** Wire shadow offset calculation */
export interface HifiWireShadow {
  offsetX: number;
  offsetY: number;
  alpha: number;
}

/** Calculate wire shadow offset */
export function calculateWireShadowOffset(
  _wireColor: number,
  thickness: number,
): HifiWireShadow {
  return {
    offsetX: DEFAULT_HIFI_WIRE_SHADOW_OFFSET,
    offsetY: DEFAULT_HIFI_WIRE_SHADOW_OFFSET,
    alpha: Math.min(0.3, thickness * 0.05),
  };
}

/** Endpoint plug geometry */
export interface HifiEndpointPlug {
  cx: number;
  cy: number;
  radius: number;
  fillColor: number;
  strokeColor: number;
}

/** Generate wire endpoint plug circle geometry */
export function generateEndpointPlug(
  x: number,
  y: number,
  _direction: string,
  plugRadius?: number,
): HifiEndpointPlug {
  const r = plugRadius || DEFAULT_HIFI_WIRE_PLUG_RADIUS;
  return {
    cx: x,
    cy: y,
    radius: r,
    fillColor: 0xC0C0C0, // Silver metallic
    strokeColor: 0x808080,
  };
}

/** Wire selection glow parameters */
export interface HifiWireGlow {
  glowRadius: number;
  glowAlpha: number;
  glowColor: number;
}

/** Calculate wire selection/hover glow parameters */
export function calculateWireSelectionGlow(
  thickness: number,
  isSelected: boolean,
  isHovered: boolean,
): HifiWireGlow {
  if (isSelected) {
    return {
      glowRadius: thickness + DEFAULT_HIFI_WIRE_GLOW_RADIUS,
      glowAlpha: DEFAULT_HIFI_WIRE_GLOW_ALPHA,
      glowColor: DEFAULT_HIFI_WIRE_GLOW_COLOR,
    };
  }
  if (isHovered) {
    return {
      glowRadius: thickness + DEFAULT_HIFI_WIRE_GLOW_RADIUS * 0.6,
      glowAlpha: DEFAULT_HIFI_WIRE_GLOW_ALPHA * 0.7,
      glowColor: 0x93C5FD, // Lighter blue for hover
    };
  }
  return {
    glowRadius: 0,
    glowAlpha: 0,
    glowColor: 0x000000,
  };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 17: REGISTRY & SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

/**
 * Generic registry for high-fidelity renderer models.
 * Follows the established Map + order array pattern.
 */
export class HighFidelityRendererRegistry<T extends Record<string, any>> {
  private registry = new Map<string, T>();
  private order: string[] = [];
  private idField: string;

  constructor(idField: string) {
    this.idField = idField;
  }

  /** Register a model. Deep-copies on write. */
  register(model: T): void {
    const id = String(model[this.idField]);
    this.registry.set(id, JSON.parse(JSON.stringify(model)));
    if (!this.order.includes(id)) {
      this.order.push(id);
    }
  }

  /** Get a model by ID. Returns deep copy or undefined. */
  get(id: string): T | undefined {
    const m = this.registry.get(id);
    return m ? JSON.parse(JSON.stringify(m)) : undefined;
  }

  /** Get all models in insertion order. Returns deep copies. */
  getAll(): T[] {
    return this.order
      .map(id => this.registry.get(id))
      .filter((m): m is T => m !== undefined)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  /** Update a model by merging partial data. */
  update(id: string, partial: Partial<T>): void {
    const existing = this.registry.get(id);
    if (!existing) return;
    this.registry.set(id, JSON.parse(JSON.stringify({ ...existing, ...partial, [this.idField]: id })));
  }

  /** Remove a model by ID. */
  remove(id: string): void {
    this.registry.delete(id);
    this.order = this.order.filter(e => e !== id);
  }

  /** Clear all models. */
  clear(): void {
    this.registry.clear();
    this.order = [];
  }

  /** Get all registered keys. */
  keys(): string[] {
    return [...this.order];
  }

  /** Check if a model exists. */
  has(id: string): boolean {
    return this.registry.has(id);
  }

  /** Get the count of registered models. */
  get size(): number {
    return this.registry.size;
  }

  /** Clone the entire registry. */
  clone(): HighFidelityRendererRegistry<T> {
    const copy = new HighFidelityRendererRegistry<T>(this.idField);
    for (const id of this.order) {
      const m = this.registry.get(id);
      if (m) copy.register(JSON.parse(JSON.stringify(m)));
    }
    return copy;
  }

  /** Serialize to JSON-safe object. */
  toJSON(): { idField: string; models: T[] } {
    return {
      idField: this.idField,
      models: this.getAll(),
    };
  }

  /** Deserialize from JSON-safe object. */
  fromJSON(data: { models: T[] }): void {
    this.clear();
    for (const m of data.models) {
      this.register(m);
    }
  }
}

/**
 * Synchronizer that holds all 14 high-fidelity renderer registries.
 * Provides snapshot, clear, clone, serialization methods.
 */
export class HighFidelityRendererSynchronizer {
  public componentTextures = new HighFidelityRendererRegistry<ComponentTextureModel>('textureId');
  public textureAtlases = new HighFidelityRendererRegistry<TextureAtlasModel>('atlasId');
  public textureCaches = new HighFidelityRendererRegistry<TextureCacheModel>('cacheId');
  public textureMetadata = new HighFidelityRendererRegistry<TextureMetadataModel>('metadataId');
  public renderPerformance = new HighFidelityRendererRegistry<RenderPerformanceModel>('perfId');
  public viewportCullings = new HighFidelityRendererRegistry<ViewportCullingModel>('cullingId');
  public objectPools = new HighFidelityRendererRegistry<ObjectPoolModel>('poolId');
  public dirtyRects = new HighFidelityRendererRegistry<DirtyRectModel>('dirtyRectId');
  public spatialIndices = new HighFidelityRendererRegistry<SpatialIndexModel>('spatialId');
  public renderBatches = new HighFidelityRendererRegistry<RenderBatchModel>('batchId');
  public cadGrids = new HighFidelityRendererRegistry<CadGridModel>('cadGridId');
  public debugOverlays = new HighFidelityRendererRegistry<DebugOverlayModel>('debugId');
  public startupScenes = new HighFidelityRendererRegistry<StartupSceneModel>('sceneId');
  public pinRenderStates = new HighFidelityRendererRegistry<PinRenderStateModel>('pinRenderId');

  /** Build a snapshot of all registries */
  buildSnapshot(): HighFidelityRendererSnapshot {
    return {
      componentTextures: this.componentTextures.getAll(),
      textureAtlases: this.textureAtlases.getAll(),
      textureCaches: this.textureCaches.getAll(),
      textureMetadata: this.textureMetadata.getAll(),
      renderPerformance: this.renderPerformance.getAll(),
      viewportCullings: this.viewportCullings.getAll(),
      objectPools: this.objectPools.getAll(),
      dirtyRects: this.dirtyRects.getAll(),
      spatialIndices: this.spatialIndices.getAll(),
      renderBatches: this.renderBatches.getAll(),
      cadGrids: this.cadGrids.getAll(),
      debugOverlays: this.debugOverlays.getAll(),
      startupScenes: this.startupScenes.getAll(),
      pinRenderStates: this.pinRenderStates.getAll(),
    };
  }

  /** Clear all registries */
  clear(): void {
    this.componentTextures.clear();
    this.textureAtlases.clear();
    this.textureCaches.clear();
    this.textureMetadata.clear();
    this.renderPerformance.clear();
    this.viewportCullings.clear();
    this.objectPools.clear();
    this.dirtyRects.clear();
    this.spatialIndices.clear();
    this.renderBatches.clear();
    this.cadGrids.clear();
    this.debugOverlays.clear();
    this.startupScenes.clear();
    this.pinRenderStates.clear();
  }

  /** Clone the entire synchronizer with all registries */
  clone(): HighFidelityRendererSynchronizer {
    const copy = new HighFidelityRendererSynchronizer();
    copy.componentTextures = this.componentTextures.clone();
    copy.textureAtlases = this.textureAtlases.clone();
    copy.textureCaches = this.textureCaches.clone();
    copy.textureMetadata = this.textureMetadata.clone();
    copy.renderPerformance = this.renderPerformance.clone();
    copy.viewportCullings = this.viewportCullings.clone();
    copy.objectPools = this.objectPools.clone();
    copy.dirtyRects = this.dirtyRects.clone();
    copy.spatialIndices = this.spatialIndices.clone();
    copy.renderBatches = this.renderBatches.clone();
    copy.cadGrids = this.cadGrids.clone();
    copy.debugOverlays = this.debugOverlays.clone();
    copy.startupScenes = this.startupScenes.clone();
    copy.pinRenderStates = this.pinRenderStates.clone();
    return copy;
  }

  /** Serialize to JSON-safe object */
  toJSON(): Record<string, unknown> {
    return {
      componentTextures: this.componentTextures.toJSON(),
      textureAtlases: this.textureAtlases.toJSON(),
      textureCaches: this.textureCaches.toJSON(),
      textureMetadata: this.textureMetadata.toJSON(),
      renderPerformance: this.renderPerformance.toJSON(),
      viewportCullings: this.viewportCullings.toJSON(),
      objectPools: this.objectPools.toJSON(),
      dirtyRects: this.dirtyRects.toJSON(),
      spatialIndices: this.spatialIndices.toJSON(),
      renderBatches: this.renderBatches.toJSON(),
      cadGrids: this.cadGrids.toJSON(),
      debugOverlays: this.debugOverlays.toJSON(),
      startupScenes: this.startupScenes.toJSON(),
      pinRenderStates: this.pinRenderStates.toJSON(),
    };
  }

  /** Deserialize from JSON-safe object */
  fromJSON(data: Record<string, { models: unknown[] }>): void {
    this.clear();
    if (data.componentTextures) this.componentTextures.fromJSON(data.componentTextures as { models: ComponentTextureModel[] });
    if (data.textureAtlases) this.textureAtlases.fromJSON(data.textureAtlases as { models: TextureAtlasModel[] });
    if (data.textureCaches) this.textureCaches.fromJSON(data.textureCaches as { models: TextureCacheModel[] });
    if (data.textureMetadata) this.textureMetadata.fromJSON(data.textureMetadata as { models: TextureMetadataModel[] });
    if (data.renderPerformance) this.renderPerformance.fromJSON(data.renderPerformance as { models: RenderPerformanceModel[] });
    if (data.viewportCullings) this.viewportCullings.fromJSON(data.viewportCullings as { models: ViewportCullingModel[] });
    if (data.objectPools) this.objectPools.fromJSON(data.objectPools as { models: ObjectPoolModel[] });
    if (data.dirtyRects) this.dirtyRects.fromJSON(data.dirtyRects as { models: DirtyRectModel[] });
    if (data.spatialIndices) this.spatialIndices.fromJSON(data.spatialIndices as { models: SpatialIndexModel[] });
    if (data.renderBatches) this.renderBatches.fromJSON(data.renderBatches as { models: RenderBatchModel[] });
    if (data.cadGrids) this.cadGrids.fromJSON(data.cadGrids as { models: CadGridModel[] });
    if (data.debugOverlays) this.debugOverlays.fromJSON(data.debugOverlays as { models: DebugOverlayModel[] });
    if (data.startupScenes) this.startupScenes.fromJSON(data.startupScenes as { models: StartupSceneModel[] });
    if (data.pinRenderStates) this.pinRenderStates.fromJSON(data.pinRenderStates as { models: PinRenderStateModel[] });
  }
}
