import {
  RenderSceneModel,
  RenderSceneType,
  RenderLayerModel,
  RenderLayerType,
  CameraMetadata,
  ViewportMetadata,
  ViewportState,
  SceneSyncSnapshot,
  ComponentVisualModel,
  WireVisualRegistryEntry,
  BoardVisualRegistryEntry,
  SignalVisualRegistryEntry,
  AnimationRegistryEntry,
  StageSyncState,
} from '../types';

import { RenderRegistry } from './render-registry';

// ─── Default Constants ────────────────────────────────────────────

const DEFAULT_VIEWPORT: ViewportState = { width: 480, height: 360 };

const DEFAULT_VIEWPORT_METADATA: ViewportMetadata = {
  width: 480,
  height: 360,
  scaleMode: 'fit',
  backgroundColor: '#FFFFFF',
  futureResizeHints: {},
};

const DEFAULT_CAMERA_METADATA: CameraMetadata = {
  zoom: 1,
  panX: 0,
  panY: 0,
  viewport: { ...DEFAULT_VIEWPORT },
  futureNavigationHints: {},
};

const DEFAULT_RENDER_SCENE_TYPE: RenderSceneType = 'BREADBOARD';
const DEFAULT_RENDER_LAYER_TYPE: RenderLayerType = 'COMPONENT';

// ─── Scene Model Factory ──────────────────────────────────────────

export function createDefaultSceneModel(sceneId = 'default_scene'): RenderSceneModel {
  return {
    sceneId,
    sceneType: DEFAULT_RENDER_SCENE_TYPE,
    displayName: 'Default Scene',
    layerIds: [],
    cameraMetadata: JSON.parse(JSON.stringify(DEFAULT_CAMERA_METADATA)),
    viewportMetadata: JSON.parse(JSON.stringify(DEFAULT_VIEWPORT_METADATA)),
    futureRendererHints: {},
  };
}

export function createDefaultLayerModel(layerId = 'default_layer', layerType: RenderLayerType = DEFAULT_RENDER_LAYER_TYPE): RenderLayerModel {
  return {
    layerId,
    layerType,
    displayName: `Layer ${layerId}`,
    visibility: true,
    zIndex: 0,
    futureThemeHints: {},
  };
}

// ─── Camera Metadata Factory ──────────────────────────────────────

export function createCameraMetadata(overrides: Partial<CameraMetadata> = {}): CameraMetadata {
  return JSON.parse(JSON.stringify({ ...DEFAULT_CAMERA_METADATA, ...overrides }));
}

export function createViewportMetadata(overrides: Partial<ViewportMetadata> = {}): ViewportMetadata {
  return JSON.parse(JSON.stringify({ ...DEFAULT_VIEWPORT_METADATA, ...overrides }));
}

// ─── Validation (warning-only) ────────────────────────────────────

export interface ValidationWarning {
  code: string;
  message: string;
}

export function validateSceneModel(scene: RenderSceneModel, warnPrefix = '[RendererFoundation]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!scene || typeof scene !== 'object') {
    warnings.push({ code: 'INVALID_SCENE', message: 'Scene is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!scene.sceneId) {
    warnings.push({ code: 'INVALID_SCENE_ID', message: 'Scene ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!scene.sceneType) {
    warnings.push({ code: 'INVALID_SCENE_TYPE', message: 'Scene type is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof scene.cameraMetadata.zoom !== 'number' || scene.cameraMetadata.zoom <= 0) {
    warnings.push({ code: 'INVALID_CAMERA_ZOOM', message: `Camera zoom must be a positive number, got ${scene.cameraMetadata.zoom}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof scene.cameraMetadata.panX !== 'number' || !isFinite(scene.cameraMetadata.panX)) {
    warnings.push({ code: 'INVALID_CAMERA_PAN_X', message: `Camera panX must be a finite number, got ${scene.cameraMetadata.panX}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof scene.cameraMetadata.panY !== 'number' || !isFinite(scene.cameraMetadata.panY)) {
    warnings.push({ code: 'INVALID_CAMERA_PAN_Y', message: `Camera panY must be a finite number, got ${scene.cameraMetadata.panY}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(scene.layerIds)) {
    warnings.push({ code: 'INVALID_LAYER_IDS', message: 'layerIds must be an array.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateLayerModel(layer: RenderLayerModel, warnPrefix = '[RendererFoundation]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!layer || typeof layer !== 'object') {
    warnings.push({ code: 'INVALID_LAYER', message: 'Layer is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!layer.layerId) {
    warnings.push({ code: 'INVALID_LAYER_ID', message: 'Layer ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!layer.layerType) {
    warnings.push({ code: 'INVALID_LAYER_TYPE', message: 'Layer type is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof layer.visibility !== 'boolean') {
    warnings.push({ code: 'INVALID_LAYER_VISIBILITY', message: 'Layer visibility must be a boolean.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof layer.zIndex !== 'number' || !Number.isInteger(layer.zIndex)) {
    warnings.push({ code: 'INVALID_LAYER_Z_INDEX', message: `Layer zIndex must be an integer, got ${layer.zIndex}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateCameraMetadata(camera: CameraMetadata, warnPrefix = '[RendererFoundation]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!camera || typeof camera !== 'object') {
    warnings.push({ code: 'INVALID_CAMERA', message: 'Camera metadata is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (typeof camera.zoom !== 'number' || camera.zoom <= 0 || !isFinite(camera.zoom)) {
    warnings.push({ code: 'INVALID_CAMERA_ZOOM', message: `Camera zoom must be a positive finite number, got ${camera.zoom}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof camera.panX !== 'number' || !isFinite(camera.panX)) {
    warnings.push({ code: 'INVALID_CAMERA_PAN_X', message: `Camera panX must be a finite number, got ${camera.panX}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof camera.panY !== 'number' || !isFinite(camera.panY)) {
    warnings.push({ code: 'INVALID_CAMERA_PAN_Y', message: `Camera panY must be a finite number, got ${camera.panY}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!camera.viewport || typeof camera.viewport.width !== 'number' || typeof camera.viewport.height !== 'number') {
    warnings.push({ code: 'INVALID_CAMERA_VIEWPORT', message: 'Camera viewport must have width and height.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateDuplicateLayerIds(layers: RenderLayerModel[], warnPrefix = '[RendererFoundation]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(layers)) {
    warnings.push({ code: 'INVALID_LAYERS_ARRAY', message: 'Layers is not an array.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  const seen = new Set<string>();
  for (const layer of layers) {
    if (seen.has(layer.layerId)) {
      warnings.push({ code: 'DUPLICATE_LAYER_ID', message: `Duplicate layer ID "${layer.layerId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(layer.layerId);
  }
  return warnings;
}

export function validateDuplicateSceneIds(scenes: RenderSceneModel[], warnPrefix = '[RendererFoundation]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(scenes)) {
    warnings.push({ code: 'INVALID_SCENES_ARRAY', message: 'Scenes is not an array.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  const seen = new Set<string>();
  for (const scene of scenes) {
    if (seen.has(scene.sceneId)) {
      warnings.push({ code: 'DUPLICATE_SCENE_ID', message: `Duplicate scene ID "${scene.sceneId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(scene.sceneId);
  }
  return warnings;
}

// ─── Scene Synchronization ────────────────────────────────────────

export class SceneSynchronizer {
  private readonly layerRegistry = new RenderRegistry<RenderLayerModel>();
  private readonly sceneRegistry = new RenderRegistry<RenderSceneModel>();

  private readonly warnPrefix = '[SceneSynchronizer]';

  public get layers(): RenderRegistry<RenderLayerModel> {
    return this.layerRegistry;
  }

  public get scenes(): RenderRegistry<RenderSceneModel> {
    return this.sceneRegistry;
  }

  /**
   * Synchronizes visual metadata from runtime StageSyncState snapshots into
   * a SceneSyncSnapshot. Creates a default scene and layers if none exist.
   */
  public sync(
    snapshot: StageSyncState[],
    componentVisualModels: ComponentVisualModel[] = [],
    wireVisualRegistry: WireVisualRegistryEntry[] = [],
    boardVisualRegistry: BoardVisualRegistryEntry[] = [],
    signalVisualRegistry: SignalVisualRegistryEntry[] = [],
    animationRegistry: AnimationRegistryEntry[] = [],
  ): SceneSyncSnapshot {
    if (!snapshot || !Array.isArray(snapshot)) {
      console.warn(`${this.warnPrefix} sync called with invalid snapshot.`);
      return this.emptySnapshot();
    }

    const scene = this.resolveScene(snapshot);
    const layers = this.resolveLayers(snapshot);

    validateDuplicateLayerIds(layers, this.warnPrefix);

    const syncLayers = layers.map(l => {
      const existing = this.layerRegistry.lookupRaw(l.layerId);
      if (existing) {
        const merged = { ...existing, ...l };
        this.layerRegistry.update(l.layerId, merged);
        return merged as RenderLayerModel;
      }
      this.layerRegistry.register(l.layerId, l, this.warnPrefix);
      return l;
    });

    const layerIds = syncLayers.map(l => l.layerId);

    const syncedScene: RenderSceneModel = {
      ...scene,
      layerIds,
      cameraMetadata: JSON.parse(JSON.stringify(scene.cameraMetadata)),
      viewportMetadata: JSON.parse(JSON.stringify(scene.viewportMetadata)),
    };

    this.sceneRegistry.register(syncedScene.sceneId, syncedScene, this.warnPrefix);

    return {
      scene: JSON.parse(JSON.stringify(syncedScene)),
      layers: JSON.parse(JSON.stringify(syncLayers)),
      componentVisualModels: JSON.parse(JSON.stringify(componentVisualModels)),
      wireVisualRegistry: JSON.parse(JSON.stringify(wireVisualRegistry)),
      boardVisualRegistry: JSON.parse(JSON.stringify(boardVisualRegistry)),
      signalVisualRegistry: JSON.parse(JSON.stringify(signalVisualRegistry)),
      animationRegistry: JSON.parse(JSON.stringify(animationRegistry)),
    };
  }

  /**
   * Creates a SceneSyncSnapshot from explicit model data without a snapshot.
   */
  public buildFromModels(
    scene: RenderSceneModel,
    layers: RenderLayerModel[],
    componentVisualModels: ComponentVisualModel[] = [],
    wireVisualRegistry: WireVisualRegistryEntry[] = [],
    boardVisualRegistry: BoardVisualRegistryEntry[] = [],
    signalVisualRegistry: SignalVisualRegistryEntry[] = [],
    animationRegistry: AnimationRegistryEntry[] = [],
  ): SceneSyncSnapshot {
    validateDuplicateLayerIds(layers, this.warnPrefix);
    validateSceneModel(scene, this.warnPrefix);

    for (const layer of layers) {
      validateLayerModel(layer, this.warnPrefix);
      this.layerRegistry.register(layer.layerId, layer, this.warnPrefix);
    }

    const syncedScene: RenderSceneModel = {
      ...scene,
      layerIds: layers.map(l => l.layerId),
      cameraMetadata: JSON.parse(JSON.stringify(scene.cameraMetadata)),
      viewportMetadata: JSON.parse(JSON.stringify(scene.viewportMetadata)),
    };

    this.sceneRegistry.register(syncedScene.sceneId, syncedScene, this.warnPrefix);

    return {
      scene: JSON.parse(JSON.stringify(syncedScene)),
      layers: JSON.parse(JSON.stringify(layers)),
      componentVisualModels: JSON.parse(JSON.stringify(componentVisualModels)),
      wireVisualRegistry: JSON.parse(JSON.stringify(wireVisualRegistry)),
      boardVisualRegistry: JSON.parse(JSON.stringify(boardVisualRegistry)),
      signalVisualRegistry: JSON.parse(JSON.stringify(signalVisualRegistry)),
      animationRegistry: JSON.parse(JSON.stringify(animationRegistry)),
    };
  }

  /**
   * Clears all internal registries.
   */
  public clear(): void {
    this.layerRegistry.clear();
    this.sceneRegistry.clear();
  }

  /**
   * Returns a deep clone of the synchronizer's internal state.
   */
  public clone(): SceneSynchronizer {
    const cloned = new SceneSynchronizer();
    cloned.layerRegistry.fromJSON(this.layerRegistry.getAll(), l => l.layerId, this.warnPrefix);
    cloned.sceneRegistry.fromJSON(this.sceneRegistry.getAll(), s => s.sceneId, this.warnPrefix);
    return cloned;
  }

  /**
   * Serializes internal state to a JSON-safe object.
   */
  public toJSON(): { scenes: RenderSceneModel[]; layers: RenderLayerModel[] } {
    return {
      scenes: this.sceneRegistry.getAll(),
      layers: this.layerRegistry.getAll(),
    };
  }

  /**
   * Restores internal state from a JSON-safe object.
   */
  public fromJSON(data: { scenes: RenderSceneModel[]; layers: RenderLayerModel[] }): void {
    this.clear();
    for (const scene of data.scenes) {
      this.sceneRegistry.register(scene.sceneId, scene, this.warnPrefix);
    }
    for (const layer of data.layers) {
      this.layerRegistry.register(layer.layerId, layer, this.warnPrefix);
    }
  }

  private emptySnapshot(): SceneSyncSnapshot {
    const emptyScene = createDefaultSceneModel();
    return {
      scene: emptyScene,
      layers: [],
      componentVisualModels: [],
      wireVisualRegistry: [],
      boardVisualRegistry: [],
      signalVisualRegistry: [],
      animationRegistry: [],
    };
  }

  private resolveScene(snapshot: StageSyncState[]): RenderSceneModel {
    if (!snapshot.length) {
      return createDefaultSceneModel();
    }
    const first = snapshot[0];
    const sceneId = first?.targetId || 'default_scene';

    let sceneType: RenderSceneType = 'BREADBOARD';
    if (first && first.stemverseVisualStates && first.stemverseVisualStates.length > 0) {
      const visualType = first.stemverseVisualStates[0].visualType;
      if (visualType === 'BREADBOARD') sceneType = 'BREADBOARD';
      else if (visualType === 'PCB') sceneType = 'PCB';
    }

    const cameraMetadata: CameraMetadata = {
      zoom: first?.camera?.zoom ?? 1,
      panX: first?.camera?.x ?? 0,
      panY: first?.camera?.y ?? 0,
      viewport: first?.viewport ? { width: first.viewport.width, height: first.viewport.height } : { ...DEFAULT_VIEWPORT },
      futureNavigationHints: {},
    };

    const viewportMetadata: ViewportMetadata = {
      width: first?.viewport?.width ?? 480,
      height: first?.viewport?.height ?? 360,
      scaleMode: 'fit',
      backgroundColor: '#FFFFFF',
      futureResizeHints: {},
    };

    return {
      sceneId,
      sceneType,
      displayName: `Scene ${sceneId}`,
      layerIds: [],
      cameraMetadata: JSON.parse(JSON.stringify(cameraMetadata)),
      viewportMetadata: JSON.parse(JSON.stringify(viewportMetadata)),
      futureRendererHints: {},
    };
  }

  private resolveLayers(snapshot: StageSyncState[]): RenderLayerModel[] {
    const layers: RenderLayerModel[] = [];
    const seenTypes = new Set<string>();

    for (const snap of snapshot) {
      if (snap.componentVisualModels && snap.componentVisualModels.length > 0 && !seenTypes.has('component')) {
        layers.push({
          layerId: 'component_layer',
          layerType: 'COMPONENT',
          displayName: 'Components',
          visibility: true,
          zIndex: 10,
          futureThemeHints: {},
        });
        seenTypes.add('component');
      }
      if (snap.wireVisualRegistry && snap.wireVisualRegistry.length > 0 && !seenTypes.has('wire')) {
        layers.push({
          layerId: 'wire_layer',
          layerType: 'WIRE',
          displayName: 'Wires',
          visibility: true,
          zIndex: 20,
          futureThemeHints: {},
        });
        seenTypes.add('wire');
      }
      if (snap.boardVisualRegistry && snap.boardVisualRegistry.length > 0 && !seenTypes.has('board')) {
        layers.push({
          layerId: 'board_layer',
          layerType: 'BOARD',
          displayName: 'Boards',
          visibility: true,
          zIndex: 5,
          futureThemeHints: {},
        });
        seenTypes.add('board');
      }
      if (snap.signalVisualRegistry && snap.signalVisualRegistry.length > 0 && !seenTypes.has('signal')) {
        layers.push({
          layerId: 'signal_layer',
          layerType: 'SIGNAL',
          displayName: 'Signals',
          visibility: true,
          zIndex: 30,
          futureThemeHints: {},
        });
        seenTypes.add('signal');
      }
    }

    if (seenTypes.size === 0) {
      layers.push({
        layerId: 'default_layer',
        layerType: 'COMPONENT',
        displayName: 'Default Layer',
        visibility: true,
        zIndex: 0,
        futureThemeHints: {},
      });
    }

    return layers;
  }
}
