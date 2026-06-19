import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

// ─── MODELS ─────────────────────────────────────────────────────────────────────

export interface ComponentScaleModel {
  scaleId: string;
  componentType: string;
  relativeScale: number;
  referenceWidth: number;
  referenceHeight: number;
  futureScaleHints: Record<string, unknown>;
}

export interface ScaleProfileModel {
  profileId: string;
  profileName: string;
  referenceBreadboardType: string;
  referenceBreadboardWidth: number;
  componentScales: Record<string, number>;
  futureProfileHints: Record<string, unknown>;
}

export interface ViewportScaleModel {
  viewportId: string;
  dpiScale: number;
  zoomLevel: number;
  effectiveScale: number;
  futureViewportHints: Record<string, unknown>;
}

export interface ComponentScaleSnapshot {
  scaleModels: ComponentScaleModel[];
  profiles: ScaleProfileModel[];
  viewportModels: ViewportScaleModel[];
}

// ─── DEFAULT SCALE RATIOS ───────────────────────────────────────────────────────

export const DEFAULT_COMPONENT_SCALE_RATIOS: Record<string, number> = {
  'arduino_uno_r3': 0.30,
  'esp32_devkit_v1': 0.25,
  'arduino_nano': 0.20,
  'hc_sr04': 0.18,
  'led_5mm': 0.04,
  'led_generic': 0.04,
  'resistor': 0.08,
  'resistor_generic': 0.08,
  'sg90_servo': 0.15,
  'oled_ssd1306': 0.12,
  'lcd_1602': 0.22,
  'relay_module': 0.15,
  'ir_sensor': 0.10,
  'mq2_sensor': 0.10,
  'dht11_sensor': 0.08,
  'buzzer': 0.06,
  'potentiometer': 0.08,
  'push_button': 0.05,
};

// ─── FACTORY FUNCTIONS ──────────────────────────────────────────────────────────

export function createDefaultComponentScaleModel(
  scaleId = 'default_scale',
  overrides: Partial<ComponentScaleModel> = {},
): ComponentScaleModel {
  return {
    scaleId,
    componentType: overrides.componentType || 'generic',
    relativeScale: overrides.relativeScale !== undefined ? overrides.relativeScale : 1.0,
    referenceWidth: overrides.referenceWidth !== undefined ? overrides.referenceWidth : 100,
    referenceHeight: overrides.referenceHeight !== undefined ? overrides.referenceHeight : 100,
    futureScaleHints: overrides.futureScaleHints || {},
    ...overrides,
  };
}

export function createDefaultScaleProfileModel(
  profileId = 'default_profile',
  overrides: Partial<ScaleProfileModel> = {},
): ScaleProfileModel {
  return {
    profileId,
    profileName: overrides.profileName || 'Default Profile',
    referenceBreadboardType: overrides.referenceBreadboardType || 'full_size',
    referenceBreadboardWidth: overrides.referenceBreadboardWidth !== undefined ? overrides.referenceBreadboardWidth : 830,
    componentScales: overrides.componentScales || { ...DEFAULT_COMPONENT_SCALE_RATIOS },
    futureProfileHints: overrides.futureProfileHints || {},
    ...overrides,
  };
}

export function createDefaultViewportScaleModel(
  viewportId = 'default_viewport',
  overrides: Partial<ViewportScaleModel> = {},
): ViewportScaleModel {
  return {
    viewportId,
    dpiScale: overrides.dpiScale !== undefined ? overrides.dpiScale : 1.0,
    zoomLevel: overrides.zoomLevel !== undefined ? overrides.zoomLevel : 1.0,
    effectiveScale: overrides.effectiveScale !== undefined ? overrides.effectiveScale : 1.0,
    futureViewportHints: overrides.futureViewportHints || {},
    ...overrides,
  };
}

// ─── MODEL VALIDATORS ───────────────────────────────────────────────────────────

export function validateComponentScaleModel(
  model: ComponentScaleModel,
  warnPrefix = '[ComponentScale]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_SCALE_MODEL', message: 'Component scale model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.scaleId) {
    warnings.push({ code: 'INVALID_SCALE_ID', message: 'Scale ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.componentType !== 'string' || !model.componentType) {
    warnings.push({ code: 'INVALID_COMPONENT_TYPE', message: `Scale "${model.scaleId}" has invalid componentType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.relativeScale !== 'number' || isNaN(model.relativeScale) || model.relativeScale < 0) {
    warnings.push({ code: 'INVALID_RELATIVE_SCALE', message: `Scale "${model.scaleId}" has invalid relativeScale.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.referenceWidth !== 'number' || isNaN(model.referenceWidth) || model.referenceWidth <= 0) {
    warnings.push({ code: 'INVALID_REFERENCE_WIDTH', message: `Scale "${model.scaleId}" has invalid referenceWidth.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.referenceHeight !== 'number' || isNaN(model.referenceHeight) || model.referenceHeight <= 0) {
    warnings.push({ code: 'INVALID_REFERENCE_HEIGHT', message: `Scale "${model.scaleId}" has invalid referenceHeight.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureScaleHints !== 'object' || model.futureScaleHints === null || Array.isArray(model.futureScaleHints)) {
    warnings.push({ code: 'INVALID_FUTURE_SCALE_HINTS', message: `Scale "${model.scaleId}" has invalid futureScaleHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateScaleProfileModel(
  model: ScaleProfileModel,
  warnPrefix = '[ComponentScale]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_PROFILE_MODEL', message: 'Scale profile model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.profileId) {
    warnings.push({ code: 'INVALID_PROFILE_ID', message: 'Profile ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.profileName !== 'string' || !model.profileName) {
    warnings.push({ code: 'INVALID_PROFILE_NAME', message: `Profile "${model.profileId}" has invalid profileName.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.referenceBreadboardType !== 'string' || !model.referenceBreadboardType) {
    warnings.push({ code: 'INVALID_REFERENCE_BREADBOARD_TYPE', message: `Profile "${model.profileId}" has invalid referenceBreadboardType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.referenceBreadboardWidth !== 'number' || isNaN(model.referenceBreadboardWidth) || model.referenceBreadboardWidth <= 0) {
    warnings.push({ code: 'INVALID_REFERENCE_BREADBOARD_WIDTH', message: `Profile "${model.profileId}" has invalid referenceBreadboardWidth.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.componentScales !== 'object' || model.componentScales === null || Array.isArray(model.componentScales)) {
    warnings.push({ code: 'INVALID_COMPONENT_SCALES', message: `Profile "${model.profileId}" has invalid componentScales.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureProfileHints !== 'object' || model.futureProfileHints === null || Array.isArray(model.futureProfileHints)) {
    warnings.push({ code: 'INVALID_FUTURE_PROFILE_HINTS', message: `Profile "${model.profileId}" has invalid futureProfileHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateViewportScaleModel(
  model: ViewportScaleModel,
  warnPrefix = '[ComponentScale]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_VIEWPORT_MODEL', message: 'Viewport scale model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.viewportId) {
    warnings.push({ code: 'INVALID_VIEWPORT_ID', message: 'Viewport ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.dpiScale !== 'number' || isNaN(model.dpiScale) || model.dpiScale <= 0) {
    warnings.push({ code: 'INVALID_DPI_SCALE', message: `Viewport "${model.viewportId}" has invalid dpiScale.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.zoomLevel !== 'number' || isNaN(model.zoomLevel) || model.zoomLevel <= 0) {
    warnings.push({ code: 'INVALID_ZOOM_LEVEL', message: `Viewport "${model.viewportId}" has invalid zoomLevel.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.effectiveScale !== 'number' || isNaN(model.effectiveScale) || model.effectiveScale <= 0) {
    warnings.push({ code: 'INVALID_EFFECTIVE_SCALE', message: `Viewport "${model.viewportId}" has invalid effectiveScale.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureViewportHints !== 'object' || model.futureViewportHints === null || Array.isArray(model.futureViewportHints)) {
    warnings.push({ code: 'INVALID_FUTURE_VIEWPORT_HINTS', message: `Viewport "${model.viewportId}" has invalid futureViewportHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ─── DUPLICATE VALIDATORS ───────────────────────────────────────────────────────

export function validateDuplicateScaleIds(models: ComponentScaleModel[], warnPrefix = '[ComponentScale]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.scaleId)) {
      warnings.push({ code: 'DUPLICATE_SCALE_ID', message: `Duplicate scale ID "${m.scaleId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.scaleId);
  }
  return warnings;
}

export function validateDuplicateProfileIds(models: ScaleProfileModel[], warnPrefix = '[ComponentScale]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.profileId)) {
      warnings.push({ code: 'DUPLICATE_PROFILE_ID', message: `Duplicate profile ID "${m.profileId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.profileId);
  }
  return warnings;
}

export function validateDuplicateViewportScaleIds(models: ViewportScaleModel[], warnPrefix = '[ComponentScale]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.viewportId)) {
      warnings.push({ code: 'DUPLICATE_VIEWPORT_ID', message: `Duplicate viewport ID "${m.viewportId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.viewportId);
  }
  return warnings;
}

// ─── BEHAVIORS & RUNTIME LOGIC ──────────────────────────────────────────────────

export function computeComponentRenderScale(
  componentType: string,
  assetImageWidth: number,
  referenceBreadboardWidth: number,
  profile: ScaleProfileModel,
): number {
  const ratio = profile.componentScales[componentType] ?? DEFAULT_COMPONENT_SCALE_RATIOS[componentType] ?? 0.10;
  if (assetImageWidth <= 0 || referenceBreadboardWidth <= 0) {
    console.warn(`[ComponentScale] computeComponentRenderScale: invalid dimensions for "${componentType}".`);
    return ratio;
  }
  const desiredPixelWidth = referenceBreadboardWidth * ratio;
  return desiredPixelWidth / assetImageWidth;
}

export function computeAllScales(
  componentTypes: string[],
  assetWidths: Record<string, number>,
  referenceBBWidth: number,
  profile: ScaleProfileModel,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const ct of componentTypes) {
    const assetWidth = assetWidths[ct] ?? 100;
    result.set(ct, computeComponentRenderScale(ct, assetWidth, referenceBBWidth, profile));
  }
  return result;
}

// ─── SYNCHRONIZER CLASS ─────────────────────────────────────────────────────────

export class ScaleSynchronizer {
  private readonly scaleRegistry = new RenderRegistry<ComponentScaleModel>();
  private readonly profileRegistry = new RenderRegistry<ScaleProfileModel>();
  private readonly viewportRegistry = new RenderRegistry<ViewportScaleModel>();

  private readonly warnPrefix = '[ScaleSynchronizer]';

  // ── ComponentScaleModel CRUD ──

  public registerScaleModel(model: ComponentScaleModel): void {
    validateComponentScaleModel(model, this.warnPrefix);
    this.scaleRegistry.register(model.scaleId, model, this.warnPrefix);
  }

  public getScaleModel(scaleId: string): ComponentScaleModel | undefined {
    return this.scaleRegistry.lookup(scaleId);
  }

  public getAllScaleModels(): ComponentScaleModel[] {
    return this.scaleRegistry.getAll();
  }

  public updateScaleModel(scaleId: string, partial: Partial<ComponentScaleModel>): void {
    this.scaleRegistry.update(scaleId, partial, this.warnPrefix);
  }

  public removeScaleModel(scaleId: string): void {
    this.scaleRegistry.remove(scaleId, this.warnPrefix);
  }

  public clearScaleModels(): void {
    this.scaleRegistry.clear();
  }

  public getScaleModelKeys(): string[] {
    return this.scaleRegistry.keys();
  }

  public hasScaleModel(scaleId: string): boolean {
    return this.scaleRegistry.has(scaleId);
  }

  // ── ScaleProfileModel CRUD ──

  public registerProfile(model: ScaleProfileModel): void {
    validateScaleProfileModel(model, this.warnPrefix);
    this.profileRegistry.register(model.profileId, model, this.warnPrefix);
  }

  public getProfile(profileId: string): ScaleProfileModel | undefined {
    return this.profileRegistry.lookup(profileId);
  }

  public getAllProfiles(): ScaleProfileModel[] {
    return this.profileRegistry.getAll();
  }

  public updateProfile(profileId: string, partial: Partial<ScaleProfileModel>): void {
    this.profileRegistry.update(profileId, partial, this.warnPrefix);
  }

  public removeProfile(profileId: string): void {
    this.profileRegistry.remove(profileId, this.warnPrefix);
  }

  public clearProfiles(): void {
    this.profileRegistry.clear();
  }

  public getProfileKeys(): string[] {
    return this.profileRegistry.keys();
  }

  public hasProfile(profileId: string): boolean {
    return this.profileRegistry.has(profileId);
  }

  // ── ViewportScaleModel CRUD ──

  public registerViewport(model: ViewportScaleModel): void {
    validateViewportScaleModel(model, this.warnPrefix);
    this.viewportRegistry.register(model.viewportId, model, this.warnPrefix);
  }

  public getViewport(viewportId: string): ViewportScaleModel | undefined {
    return this.viewportRegistry.lookup(viewportId);
  }

  public getAllViewports(): ViewportScaleModel[] {
    return this.viewportRegistry.getAll();
  }

  public updateViewport(viewportId: string, partial: Partial<ViewportScaleModel>): void {
    this.viewportRegistry.update(viewportId, partial, this.warnPrefix);
  }

  public removeViewport(viewportId: string): void {
    this.viewportRegistry.remove(viewportId, this.warnPrefix);
  }

  public clearViewports(): void {
    this.viewportRegistry.clear();
  }

  public getViewportKeys(): string[] {
    return this.viewportRegistry.keys();
  }

  public hasViewport(viewportId: string): boolean {
    return this.viewportRegistry.has(viewportId);
  }

  // ── Snapshot / Serialization ──

  public buildSnapshot(
    scaleModels: ComponentScaleModel[] = [],
    profiles: ScaleProfileModel[] = [],
    viewportModels: ViewportScaleModel[] = [],
  ): ComponentScaleSnapshot {
    validateDuplicateScaleIds(scaleModels, this.warnPrefix);
    validateDuplicateProfileIds(profiles, this.warnPrefix);
    validateDuplicateViewportScaleIds(viewportModels, this.warnPrefix);

    for (const m of scaleModels) {
      validateComponentScaleModel(m, this.warnPrefix);
      this.scaleRegistry.register(m.scaleId, m, this.warnPrefix);
    }
    for (const m of profiles) {
      validateScaleProfileModel(m, this.warnPrefix);
      this.profileRegistry.register(m.profileId, m, this.warnPrefix);
    }
    for (const m of viewportModels) {
      validateViewportScaleModel(m, this.warnPrefix);
      this.viewportRegistry.register(m.viewportId, m, this.warnPrefix);
    }

    return this.clone();
  }

  public clear(): void {
    this.scaleRegistry.clear();
    this.profileRegistry.clear();
    this.viewportRegistry.clear();
  }

  public clone(): ComponentScaleSnapshot {
    return {
      scaleModels: safeDeepCopy(this.scaleRegistry.getAll()),
      profiles: safeDeepCopy(this.profileRegistry.getAll()),
      viewportModels: safeDeepCopy(this.viewportRegistry.getAll()),
    };
  }

  public toJSON(): string {
    return JSON.stringify(this.clone());
  }

  public fromJSON(json: string): void {
    try {
      const data = JSON.parse(json) as Partial<ComponentScaleSnapshot>;
      this.clear();
      if (data) {
        this.buildSnapshot(
          data.scaleModels || [],
          data.profiles || [],
          data.viewportModels || [],
        );
      }
    } catch (err: any) {
      console.warn(`${this.warnPrefix} failed to parse JSON snapshot: ${err.message}`);
    }
  }
}

// ─── REAL-WORLD DIMENSION CONSTANTS ─────────────────────────────────────────────

export const REFERENCE_BREADBOARD_MM = {
  type: 'MB102' as const,
  widthMm: 165,
  heightMm: 55,
};

export const COMPONENT_REAL_DIMENSIONS_MM: Record<string, {
  widthMm: number;
  heightMm: number;
  depthMm: number;
  pinSpacingMm: number;
  pinCount: number;
}> = {
  'arduino_uno_r3':   { widthMm: 69,  heightMm: 53,   depthMm: 15,   pinSpacingMm: 2.54, pinCount: 30 },
  'esp32_devkit_v1':  { widthMm: 51,  heightMm: 28,   depthMm: 10,   pinSpacingMm: 2.54, pinCount: 38 },
  'arduino_nano':     { widthMm: 45,  heightMm: 18,   depthMm: 8,    pinSpacingMm: 2.54, pinCount: 30 },
  'hc_sr04':          { widthMm: 45,  heightMm: 20,   depthMm: 15,   pinSpacingMm: 2.54, pinCount: 4 },
  'sg90_servo':       { widthMm: 36,  heightMm: 12,   depthMm: 23,   pinSpacingMm: 0,    pinCount: 3 },
  'oled_ssd1306':     { widthMm: 27,  heightMm: 19,   depthMm: 4,    pinSpacingMm: 2.54, pinCount: 4 },
  'lcd_1602':         { widthMm: 80,  heightMm: 36,   depthMm: 12,   pinSpacingMm: 2.54, pinCount: 16 },
  'relay_module':     { widthMm: 40,  heightMm: 28,   depthMm: 18,   pinSpacingMm: 2.54, pinCount: 6 },
  'led_5mm':          { widthMm: 8,   heightMm: 5,    depthMm: 5,    pinSpacingMm: 2.54, pinCount: 2 },
  'led_generic':      { widthMm: 8,   heightMm: 5,    depthMm: 5,    pinSpacingMm: 2.54, pinCount: 2 },
  'resistor':         { widthMm: 10,  heightMm: 3.5,  depthMm: 3.5,  pinSpacingMm: 2.54, pinCount: 2 },
  'resistor_generic': { widthMm: 10,  heightMm: 3.5,  depthMm: 3.5,  pinSpacingMm: 2.54, pinCount: 2 },
  'push_button':      { widthMm: 6,   heightMm: 6,    depthMm: 4,    pinSpacingMm: 2.54, pinCount: 4 },
  'potentiometer':    { widthMm: 15,  heightMm: 12,   depthMm: 10,   pinSpacingMm: 5.08, pinCount: 3 },
  'buzzer':           { widthMm: 12,  heightMm: 9.5,  depthMm: 9.5,  pinSpacingMm: 2.54, pinCount: 2 },
  'mq2_sensor':       { widthMm: 33,  heightMm: 20,   depthMm: 16,   pinSpacingMm: 2.54, pinCount: 4 },
  'dht11_sensor':     { widthMm: 25,  heightMm: 15,   depthMm: 8,    pinSpacingMm: 2.54, pinCount: 3 },
  'ir_sensor':        { widthMm: 32,  heightMm: 14,   depthMm: 10,   pinSpacingMm: 2.54, pinCount: 3 },
};

export const CALIBRATED_COMPONENT_SCALE_RATIOS: Record<string, number> = Object.fromEntries(
  Object.entries(COMPONENT_REAL_DIMENSIONS_MM).map(([key, dims]) => [
    key,
    dims.widthMm / REFERENCE_BREADBOARD_MM.widthMm,
  ]),
);

// ─── CALIBRATION FUNCTIONS ──────────────────────────────────────────────────────

export function calculateScaleFromDimensions(
  widthMm: number,
  referenceWidthMm: number,
): number {
  if (
    !Number.isFinite(widthMm) ||
    !Number.isFinite(referenceWidthMm) ||
    widthMm <= 0 ||
    referenceWidthMm <= 0
  ) {
    console.warn(
      '[calculateScaleFromDimensions] invalid input: widthMm=' +
        widthMm +
        ', referenceWidthMm=' +
        referenceWidthMm +
        '. Returning clamped default.',
    );
    return 0.01;
  }

  const raw = widthMm / referenceWidthMm;
  return Math.min(2.0, Math.max(0.01, raw));
}

export function validateScaleAgainstBreadboard(
  componentType: string,
  currentScale: number,
  warnPrefix = '[validateScaleAgainstBreadboard]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  const dims = COMPONENT_REAL_DIMENSIONS_MM[componentType];
  if (!dims) {
    return warnings;
  }

  const calibrated = CALIBRATED_COMPONENT_SCALE_RATIOS[componentType];
  if (calibrated === undefined) {
    return warnings;
  }

  const deviation = Math.abs(currentScale - calibrated) / calibrated;
  if (deviation > 0.25) {
    const msg =
      `${warnPrefix} component "${componentType}" scale ${currentScale.toFixed(4)} ` +
      `deviates ${(deviation * 100).toFixed(1)}% from calibrated ${calibrated.toFixed(4)} ` +
      `(real width: ${dims.widthMm}mm vs breadboard ${REFERENCE_BREADBOARD_MM.widthMm}mm)`;
    console.warn(msg);
    warnings.push({ code: `componentScale.${componentType}`, message: msg });
  }

  return warnings;
}

export function getScaleCalibrationReport(): {
  componentType: string;
  currentScale: number;
  calibratedScale: number;
  deviation: number;
  realWidthMm: number;
  status: 'CALIBRATED' | 'NEEDS_ADJUSTMENT' | 'MISSING_DATA';
}[] {
  const report: {
    componentType: string;
    currentScale: number;
    calibratedScale: number;
    deviation: number;
    realWidthMm: number;
    status: 'CALIBRATED' | 'NEEDS_ADJUSTMENT' | 'MISSING_DATA';
  }[] = [];

  for (const [componentType, currentScale] of Object.entries(DEFAULT_COMPONENT_SCALE_RATIOS)) {
    const dims = COMPONENT_REAL_DIMENSIONS_MM[componentType];
    if (!dims) {
      report.push({
        componentType,
        currentScale,
        calibratedScale: 0,
        deviation: 0,
        realWidthMm: 0,
        status: 'MISSING_DATA',
      });
      continue;
    }

    const calibratedScale = CALIBRATED_COMPONENT_SCALE_RATIOS[componentType] ?? 0;
    const deviation = calibratedScale > 0
      ? Math.abs(currentScale - calibratedScale) / calibratedScale
      : 0;

    report.push({
      componentType,
      currentScale,
      calibratedScale,
      deviation,
      realWidthMm: dims.widthMm,
      status: deviation > 0.25 ? 'NEEDS_ADJUSTMENT' : 'CALIBRATED',
    });
  }

  return report;
}
