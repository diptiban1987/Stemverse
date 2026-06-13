import { ComponentAssetDefinition } from '../types';
import { ValidationWarning } from './scene-model';
import { RenderRegistry } from './render-registry';
import { DEFAULT_COMPONENTS_ASSETS } from './component-asset-definitions';

// Deep-copy helper to protect against mutation leakage
function safeDeepCopy<T>(val: T): T {
  if (val === null || val === undefined) return val;
  return JSON.parse(JSON.stringify(val)) as T;
}

export function validateComponentAssetDefinition(
  model: ComponentAssetDefinition,
  warnPrefix = '[ComponentAssetLibrary]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_ASSET_MODEL', message: 'Asset model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }

  if (!model.assetId) {
    warnings.push({ code: 'INVALID_ASSET_ID', message: 'Asset ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.componentType) {
    warnings.push({ code: 'INVALID_COMPONENT_TYPE', message: `Asset "${model.assetId}" has invalid componentType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.displayName !== 'string') {
    warnings.push({ code: 'INVALID_DISPLAY_NAME', message: `Asset "${model.assetId}" has invalid displayName.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  const numericFields: (keyof ComponentAssetDefinition)[] = ['imageWidth', 'imageHeight', 'defaultScale'];
  for (const f of numericFields) {
    if (typeof model[f] !== 'number') {
      warnings.push({ code: `INVALID_${f.toUpperCase()}`, message: `Asset "${model.assetId}" has invalid ${f}.` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
  }

  if (!model.rotationCenter || typeof model.rotationCenter.x !== 'number' || typeof model.rotationCenter.y !== 'number') {
    warnings.push({ code: 'INVALID_ROTATION_CENTER', message: `Asset "${model.assetId}" has invalid rotationCenter.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.selectionBounds || typeof model.selectionBounds.x !== 'number' || typeof model.selectionBounds.y !== 'number' || typeof model.selectionBounds.width !== 'number' || typeof model.selectionBounds.height !== 'number') {
    warnings.push({ code: 'INVALID_SELECTION_BOUNDS', message: `Asset "${model.assetId}" has invalid selectionBounds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!Array.isArray(model.pinCoordinates)) {
    warnings.push({ code: 'INVALID_PIN_COORDINATES', message: `Asset "${model.assetId}" has invalid pinCoordinates.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  } else {
    for (let i = 0; i < model.pinCoordinates.length; i++) {
      const pin = model.pinCoordinates[i];
      if (!pin || typeof pin.name !== 'string' || typeof pin.number !== 'number' || typeof pin.pixelX !== 'number' || typeof pin.pixelY !== 'number') {
        warnings.push({ code: 'INVALID_PIN_DEFINITION', message: `Asset "${model.assetId}" has invalid pin at index ${i}.` });
        console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
        break;
      }
    }
  }

  return warnings;
}

export function validateDuplicateComponentAssetIds(
  models: ComponentAssetDefinition[],
  warnPrefix = '[ComponentAssetLibrary]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const seen = new Set<string>();

  for (const m of models) {
    if (!m || !m.assetId) continue;
    if (seen.has(m.assetId)) {
      warnings.push({ code: 'DUPLICATE_ASSET_ID', message: `Duplicate component asset ID "${m.assetId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.assetId);
  }

  return warnings;
}

export class ComponentAssetLibrary {
  private readonly registry = new RenderRegistry<ComponentAssetDefinition>();
  private readonly warnPrefix = '[ComponentAssetLibrary]';

  public constructor() {
    this.seedDefaults();
  }

  public seedDefaults(): void {
    for (const asset of DEFAULT_COMPONENTS_ASSETS) {
      this.registry.register(asset.assetId, asset, this.warnPrefix);
    }
  }

  public registerAsset(model: ComponentAssetDefinition): void {
    const warnings = validateComponentAssetDefinition(model, this.warnPrefix);
    if (warnings.some(w => w.code === 'INVALID_ASSET_MODEL' || w.code === 'INVALID_ASSET_ID')) {
      return;
    }
    this.registry.register(model.assetId, model, this.warnPrefix);
  }

  public getAsset(id: string): ComponentAssetDefinition | undefined {
    return this.registry.lookup(id);
  }

  public getAssets(): ComponentAssetDefinition[] {
    return this.registry.getAll ? this.registry.getAll() : Array.from(this.registry['entries'].values()).map(safeDeepCopy);
  }

  public updateAsset(id: string, updates: Partial<ComponentAssetDefinition>): void {
    const existing = this.registry.lookup(id);
    if (!existing) {
      console.warn(`${this.warnPrefix} updateAsset called for missing key "${id}".`);
      return;
    }
    const merged = { ...existing, ...updates };
    const warnings = validateComponentAssetDefinition(merged, this.warnPrefix);
    if (warnings.some(w => w.code === 'INVALID_ASSET_MODEL' || w.code === 'INVALID_ASSET_ID')) {
      return;
    }
    this.registry.update(id, updates, this.warnPrefix);
  }

  public removeAsset(id: string): void {
    this.registry.remove(id, this.warnPrefix);
  }

  public clearAssets(): void {
    this.registry.clear();
  }

  public getAssetKeys(): string[] {
    return this.registry.keys ? this.registry.keys() : Array.from(this.registry['entries'].keys());
  }

  public hasAsset(id: string): boolean {
    return this.registry.has ? this.registry.has(id) : this.registry['entries'].has(id);
  }

  public toJSON(): string {
    return JSON.stringify(this.getAssets());
  }

  public fromJSON(json: string): void {
    try {
      const data = JSON.parse(json) as ComponentAssetDefinition[];
      this.clearAssets();
      if (Array.isArray(data)) {
        validateDuplicateComponentAssetIds(data, this.warnPrefix);
        for (const asset of data) {
          this.registerAsset(asset);
        }
      }
    } catch (err: any) {
      console.warn(`${this.warnPrefix} failed to parse JSON: ${err.message}`);
    }
  }

  public sync(snapshot: ComponentAssetDefinition[]): void {
    this.clearAssets();
    if (Array.isArray(snapshot)) {
      validateDuplicateComponentAssetIds(snapshot, this.warnPrefix);
      for (const asset of snapshot) {
        this.registerAsset(asset);
      }
    }
  }
}
