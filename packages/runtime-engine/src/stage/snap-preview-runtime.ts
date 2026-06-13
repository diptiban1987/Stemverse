import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

// ─── MODELS ─────────────────────────────────────────────────────────────────────

export interface SnapPreviewModel {
  previewId: string;
  targetHoleId: string;
  breadboardId: string;
  isValid: boolean;
  ghostX: number;
  ghostY: number;
  ghostOpacity: number;
  futurePreviewHints: Record<string, unknown>;
}

export interface SnapIndicatorModel {
  indicatorId: string;
  holeX: number;
  holeY: number;
  color: number;
  radius: number;
  isPulsating: boolean;
  futureIndicatorHints: Record<string, unknown>;
}

export interface SnapPreviewSnapshot {
  previews: SnapPreviewModel[];
  indicators: SnapIndicatorModel[];
}

// ─── FACTORY FUNCTIONS ──────────────────────────────────────────────────────────

export function createDefaultSnapPreviewModel(
  previewId = 'default_preview',
  overrides: Partial<SnapPreviewModel> = {},
): SnapPreviewModel {
  return {
    previewId,
    targetHoleId: overrides.targetHoleId || '',
    breadboardId: overrides.breadboardId || '',
    isValid: overrides.isValid !== undefined ? overrides.isValid : false,
    ghostX: overrides.ghostX !== undefined ? overrides.ghostX : 0,
    ghostY: overrides.ghostY !== undefined ? overrides.ghostY : 0,
    ghostOpacity: overrides.ghostOpacity !== undefined ? overrides.ghostOpacity : 0.5,
    futurePreviewHints: overrides.futurePreviewHints || {},
    ...overrides,
  };
}

export function createDefaultSnapIndicatorModel(
  indicatorId = 'default_indicator',
  overrides: Partial<SnapIndicatorModel> = {},
): SnapIndicatorModel {
  return {
    indicatorId,
    holeX: overrides.holeX !== undefined ? overrides.holeX : 0,
    holeY: overrides.holeY !== undefined ? overrides.holeY : 0,
    color: overrides.color !== undefined ? overrides.color : 0x00ff00,
    radius: overrides.radius !== undefined ? overrides.radius : 4,
    isPulsating: overrides.isPulsating !== undefined ? overrides.isPulsating : false,
    futureIndicatorHints: overrides.futureIndicatorHints || {},
    ...overrides,
  };
}

// ─── MODEL VALIDATORS ───────────────────────────────────────────────────────────

export function validateSnapPreviewModel(
  model: SnapPreviewModel,
  warnPrefix = '[SnapPreview]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_PREVIEW_MODEL', message: 'Snap preview model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.previewId) {
    warnings.push({ code: 'INVALID_PREVIEW_ID', message: 'Preview ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.ghostX !== 'number' || isNaN(model.ghostX)) {
    warnings.push({ code: 'INVALID_GHOST_X', message: `Preview "${model.previewId}" has invalid ghostX.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.ghostY !== 'number' || isNaN(model.ghostY)) {
    warnings.push({ code: 'INVALID_GHOST_Y', message: `Preview "${model.previewId}" has invalid ghostY.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.ghostOpacity !== 'number' || isNaN(model.ghostOpacity) || model.ghostOpacity < 0 || model.ghostOpacity > 1) {
    warnings.push({ code: 'INVALID_GHOST_OPACITY', message: `Preview "${model.previewId}" has invalid ghostOpacity.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.isValid !== 'boolean') {
    warnings.push({ code: 'INVALID_IS_VALID', message: `Preview "${model.previewId}" has invalid isValid state.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futurePreviewHints !== 'object' || model.futurePreviewHints === null || Array.isArray(model.futurePreviewHints)) {
    warnings.push({ code: 'INVALID_FUTURE_PREVIEW_HINTS', message: `Preview "${model.previewId}" has invalid futurePreviewHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateSnapIndicatorModel(
  model: SnapIndicatorModel,
  warnPrefix = '[SnapPreview]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_INDICATOR_MODEL', message: 'Snap indicator model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.indicatorId) {
    warnings.push({ code: 'INVALID_INDICATOR_ID', message: 'Indicator ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.holeX !== 'number' || isNaN(model.holeX)) {
    warnings.push({ code: 'INVALID_HOLE_X', message: `Indicator "${model.indicatorId}" has invalid holeX.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.holeY !== 'number' || isNaN(model.holeY)) {
    warnings.push({ code: 'INVALID_HOLE_Y', message: `Indicator "${model.indicatorId}" has invalid holeY.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.color !== 'number' || isNaN(model.color)) {
    warnings.push({ code: 'INVALID_COLOR', message: `Indicator "${model.indicatorId}" has invalid color.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.radius !== 'number' || isNaN(model.radius) || model.radius < 0) {
    warnings.push({ code: 'INVALID_RADIUS', message: `Indicator "${model.indicatorId}" has invalid radius.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.isPulsating !== 'boolean') {
    warnings.push({ code: 'INVALID_IS_PULSATING', message: `Indicator "${model.indicatorId}" has invalid isPulsating state.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureIndicatorHints !== 'object' || model.futureIndicatorHints === null || Array.isArray(model.futureIndicatorHints)) {
    warnings.push({ code: 'INVALID_FUTURE_INDICATOR_HINTS', message: `Indicator "${model.indicatorId}" has invalid futureIndicatorHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ─── DUPLICATE VALIDATORS ───────────────────────────────────────────────────────

export function validateDuplicatePreviewIds(models: SnapPreviewModel[], warnPrefix = '[SnapPreview]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.previewId)) {
      warnings.push({ code: 'DUPLICATE_PREVIEW_ID', message: `Duplicate preview ID "${m.previewId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.previewId);
  }
  return warnings;
}

export function validateDuplicateIndicatorIds(models: SnapIndicatorModel[], warnPrefix = '[SnapPreview]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.indicatorId)) {
      warnings.push({ code: 'DUPLICATE_INDICATOR_ID', message: `Duplicate indicator ID "${m.indicatorId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.indicatorId);
  }
  return warnings;
}

// ─── BEHAVIORS & RUNTIME LOGIC ──────────────────────────────────────────────────

export function computeNearestHolePreview(
  componentPos: { x: number; y: number },
  breadboardPos: { x: number; y: number },
  breadboardHoles: Array<{ holeId: string; x: number; y: number }>,
  pinCoordinates: Array<{ pinId: string; offsetX: number; offsetY: number }>,
  snapThreshold: number,
): SnapPreviewModel | null {
  if (!breadboardHoles.length || !pinCoordinates.length) return null;

  const primaryPin = pinCoordinates[0];
  const pinWorldX = componentPos.x + primaryPin.offsetX;
  const pinWorldY = componentPos.y + primaryPin.offsetY;

  let bestHole: { holeId: string; x: number; y: number } | null = null;
  let bestDist = Infinity;

  for (const hole of breadboardHoles) {
    const holeWorldX = breadboardPos.x + hole.x;
    const holeWorldY = breadboardPos.y + hole.y;
    const dx = pinWorldX - holeWorldX;
    const dy = pinWorldY - holeWorldY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDist) {
      bestDist = dist;
      bestHole = hole;
    }
  }

  if (!bestHole || bestDist > snapThreshold) return null;

  const holeWorldX = breadboardPos.x + bestHole.x;
  const holeWorldY = breadboardPos.y + bestHole.y;
  const ghostX = holeWorldX - primaryPin.offsetX;
  const ghostY = holeWorldY - primaryPin.offsetY;

  return createDefaultSnapPreviewModel(`preview_${bestHole.holeId}`, {
    targetHoleId: bestHole.holeId,
    breadboardId: 'active_breadboard',
    isValid: true,
    ghostX,
    ghostY,
    ghostOpacity: 0.5,
  });
}

export function computeSnapIndicators(
  componentPos: { x: number; y: number },
  breadboardPos: { x: number; y: number },
  breadboardHoles: Array<{ holeId: string; x: number; y: number }>,
  pinCoordinates: Array<{ pinId: string; offsetX: number; offsetY: number }>,
  snapThreshold: number,
): SnapIndicatorModel[] {
  const indicators: SnapIndicatorModel[] = [];

  for (const pin of pinCoordinates) {
    const pinWorldX = componentPos.x + pin.offsetX;
    const pinWorldY = componentPos.y + pin.offsetY;

    let bestHole: { holeId: string; x: number; y: number } | null = null;
    let bestDist = Infinity;

    for (const hole of breadboardHoles) {
      const holeWorldX = breadboardPos.x + hole.x;
      const holeWorldY = breadboardPos.y + hole.y;
      const dx = pinWorldX - holeWorldX;
      const dy = pinWorldY - holeWorldY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        bestHole = hole;
      }
    }

    if (bestHole && bestDist <= snapThreshold) {
      const holeWorldX = breadboardPos.x + bestHole.x;
      const holeWorldY = breadboardPos.y + bestHole.y;
      indicators.push(
        createDefaultSnapIndicatorModel(`indicator_${pin.pinId}_${bestHole.holeId}`, {
          holeX: holeWorldX,
          holeY: holeWorldY,
          color: 0x00ff00,
          radius: 4,
          isPulsating: bestDist < snapThreshold * 0.5,
        }),
      );
    }
  }

  return indicators;
}

// ─── SYNCHRONIZER CLASS ─────────────────────────────────────────────────────────

export class SnapPreviewSynchronizer {
  private readonly previewRegistry = new RenderRegistry<SnapPreviewModel>();
  private readonly indicatorRegistry = new RenderRegistry<SnapIndicatorModel>();

  private readonly warnPrefix = '[SnapPreviewSynchronizer]';

  // ── SnapPreviewModel CRUD ──

  public registerPreview(model: SnapPreviewModel): void {
    validateSnapPreviewModel(model, this.warnPrefix);
    this.previewRegistry.register(model.previewId, model, this.warnPrefix);
  }

  public getPreview(previewId: string): SnapPreviewModel | undefined {
    return this.previewRegistry.lookup(previewId);
  }

  public getAllPreviews(): SnapPreviewModel[] {
    return this.previewRegistry.getAll();
  }

  public updatePreview(previewId: string, partial: Partial<SnapPreviewModel>): void {
    this.previewRegistry.update(previewId, partial, this.warnPrefix);
  }

  public removePreview(previewId: string): void {
    this.previewRegistry.remove(previewId, this.warnPrefix);
  }

  public clearPreviews(): void {
    this.previewRegistry.clear();
  }

  public getPreviewKeys(): string[] {
    return this.previewRegistry.keys();
  }

  public hasPreview(previewId: string): boolean {
    return this.previewRegistry.has(previewId);
  }

  // ── SnapIndicatorModel CRUD ──

  public registerIndicator(model: SnapIndicatorModel): void {
    validateSnapIndicatorModel(model, this.warnPrefix);
    this.indicatorRegistry.register(model.indicatorId, model, this.warnPrefix);
  }

  public getIndicator(indicatorId: string): SnapIndicatorModel | undefined {
    return this.indicatorRegistry.lookup(indicatorId);
  }

  public getAllIndicators(): SnapIndicatorModel[] {
    return this.indicatorRegistry.getAll();
  }

  public updateIndicator(indicatorId: string, partial: Partial<SnapIndicatorModel>): void {
    this.indicatorRegistry.update(indicatorId, partial, this.warnPrefix);
  }

  public removeIndicator(indicatorId: string): void {
    this.indicatorRegistry.remove(indicatorId, this.warnPrefix);
  }

  public clearIndicators(): void {
    this.indicatorRegistry.clear();
  }

  public getIndicatorKeys(): string[] {
    return this.indicatorRegistry.keys();
  }

  public hasIndicator(indicatorId: string): boolean {
    return this.indicatorRegistry.has(indicatorId);
  }

  // ── Snapshot / Serialization ──

  public buildSnapshot(
    previews: SnapPreviewModel[] = [],
    indicators: SnapIndicatorModel[] = [],
  ): SnapPreviewSnapshot {
    validateDuplicatePreviewIds(previews, this.warnPrefix);
    validateDuplicateIndicatorIds(indicators, this.warnPrefix);

    for (const m of previews) {
      validateSnapPreviewModel(m, this.warnPrefix);
      this.previewRegistry.register(m.previewId, m, this.warnPrefix);
    }
    for (const m of indicators) {
      validateSnapIndicatorModel(m, this.warnPrefix);
      this.indicatorRegistry.register(m.indicatorId, m, this.warnPrefix);
    }

    return this.clone();
  }

  public clear(): void {
    this.previewRegistry.clear();
    this.indicatorRegistry.clear();
  }

  public clone(): SnapPreviewSnapshot {
    return {
      previews: safeDeepCopy(this.previewRegistry.getAll()),
      indicators: safeDeepCopy(this.indicatorRegistry.getAll()),
    };
  }

  public toJSON(): string {
    return JSON.stringify(this.clone());
  }

  public fromJSON(json: string): void {
    try {
      const data = JSON.parse(json) as Partial<SnapPreviewSnapshot>;
      this.clear();
      if (data) {
        this.buildSnapshot(
          data.previews || [],
          data.indicators || [],
        );
      }
    } catch (err: any) {
      console.warn(`${this.warnPrefix} failed to parse JSON snapshot: ${err.message}`);
    }
  }
}
