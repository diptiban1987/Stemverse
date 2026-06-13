import { BreadboardVisualModel, BreadboardRenderSnapshot } from '../types';
import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

function safeDeepCopy<T>(val: T): T {
  if (val === null || val === undefined) return val;
  return JSON.parse(JSON.stringify(val)) as T;
}

export function validateBreadboardVisualModel(
  model: BreadboardVisualModel,
  warnPrefix = '[BreadboardVisualModel]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_VISUAL_MODEL', message: 'Breadboard visual model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }

  if (!model.breadboardId) {
    warnings.push({ code: 'INVALID_BREADBOARD_ID', message: 'Breadboard ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.assetId) {
    warnings.push({ code: 'INVALID_ASSET_ID', message: `Breadboard "${model.breadboardId}" has empty asset ID.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.width !== 'number' || typeof model.height !== 'number') {
    warnings.push({ code: 'INVALID_DIMENSIONS', message: `Breadboard "${model.breadboardId}" has invalid width or height.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!Array.isArray(model.holes)) {
    warnings.push({ code: 'INVALID_HOLES_ARRAY', message: `Breadboard "${model.breadboardId}" has invalid holes array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  } else {
    for (let i = 0; i < model.holes.length; i++) {
      const hole = model.holes[i];
      if (!hole || typeof hole.holeId !== 'string' || typeof hole.positionX !== 'number' || typeof hole.positionY !== 'number' || typeof hole.diameter !== 'number' || typeof hole.groupId !== 'string' || typeof hole.connectedGroupId !== 'string' || typeof hole.visualState !== 'string') {
        warnings.push({ code: 'INVALID_HOLE_DEFINITION', message: `Breadboard "${model.breadboardId}" has invalid hole at index ${i}.` });
        console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
        break;
      }
    }
  }

  if (!Array.isArray(model.rails)) {
    warnings.push({ code: 'INVALID_RAILS_ARRAY', message: `Breadboard "${model.breadboardId}" has invalid rails array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  } else {
    for (let i = 0; i < model.rails.length; i++) {
      const rail = model.rails[i];
      if (!rail || typeof rail.railId !== 'string' || typeof rail.railType !== 'string' || !rail.position || typeof rail.position.x !== 'number' || typeof rail.position.y !== 'number' || typeof rail.length !== 'number' || typeof rail.visualState !== 'string') {
        warnings.push({ code: 'INVALID_RAIL_DEFINITION', message: `Breadboard "${model.breadboardId}" has invalid rail at index ${i}.` });
        console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
        break;
      }
    }
  }

  if (!Array.isArray(model.labels)) {
    warnings.push({ code: 'INVALID_LABELS_ARRAY', message: `Breadboard "${model.breadboardId}" has invalid labels array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  } else {
    for (let i = 0; i < model.labels.length; i++) {
      const label = model.labels[i];
      if (!label || typeof label.labelId !== 'string' || typeof label.text !== 'string' || typeof label.positionX !== 'number' || typeof label.positionY !== 'number' || typeof label.color !== 'string' || typeof label.fontSize !== 'number') {
        warnings.push({ code: 'INVALID_LABEL_DEFINITION', message: `Breadboard "${model.breadboardId}" has invalid label at index ${i}.` });
        console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
        break;
      }
    }
  }

  return warnings;
}

export function validateDuplicateBreadboardVisualIds(
  models: BreadboardVisualModel[],
  warnPrefix = '[BreadboardVisualModel]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const seen = new Set<string>();

  for (const m of models) {
    if (!m || !m.breadboardId) continue;
    if (seen.has(m.breadboardId)) {
      warnings.push({ code: 'DUPLICATE_BREADBOARD_ID', message: `Duplicate breadboard ID "${m.breadboardId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.breadboardId);
  }

  return warnings;
}

export class BreadboardVisualSynchronizer {
  private readonly registry = new RenderRegistry<BreadboardVisualModel>();
  private readonly warnPrefix = '[BreadboardVisualSynchronizer]';

  public get breadboards(): RenderRegistry<BreadboardVisualModel> {
    return this.registry;
  }

  public buildSnapshot(breadboards: BreadboardVisualModel[] = []): BreadboardRenderSnapshot {
    validateDuplicateBreadboardVisualIds(breadboards, this.warnPrefix);
    for (const m of breadboards) {
      validateBreadboardVisualModel(m, this.warnPrefix);
      this.registry.register(m.breadboardId, m, this.warnPrefix);
    }
    return this.clone();
  }

  public clear(): void {
    this.registry.clear();
  }

  public clone(): BreadboardRenderSnapshot {
    return {
      breadboards: safeDeepCopy(this.registry.getAll ? this.registry.getAll() : Array.from(this.registry['entries'].values()).map(safeDeepCopy)),
    };
  }

  public toJSON(): string {
    return JSON.stringify(this.clone());
  }

  public fromJSON(json: string): void {
    try {
      const data = JSON.parse(json) as Partial<BreadboardRenderSnapshot>;
      this.clear();
      if (data && Array.isArray(data.breadboards)) {
        this.buildSnapshot(data.breadboards);
      }
    } catch (err: any) {
      console.warn(`${this.warnPrefix} failed to parse JSON snapshot: ${err.message}`);
    }
  }

  public sync(snapshot: BreadboardRenderSnapshot): void {
    this.clear();
    if (snapshot && Array.isArray(snapshot.breadboards)) {
      this.buildSnapshot(snapshot.breadboards);
    }
  }
}
