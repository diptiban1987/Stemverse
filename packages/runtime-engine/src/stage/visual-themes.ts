import {
  ThemeModel,
  ColorPaletteModel,
  ComponentStyleModel,
  WorkspaceStyleModel,
  VisibilityState,
  ThemeSnapshot,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

const DEFAULT_VISIBILITY_STATE: VisibilityState = 'VISIBLE';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createDefaultThemeModel(
  themeId = 'default_theme',
  overrides: Partial<ThemeModel> = {},
): ThemeModel {
  return {
    themeId,
    themeName: `Theme ${themeId}`,
    themeCategory: 'DEFAULT',
    themeVersion: '1.0.0',
    themeState: 'ACTIVE',
    visibilityState: DEFAULT_VISIBILITY_STATE,
    futureRendererHints: {},
    ...overrides,
  };
}

export function createDefaultColorPaletteModel(
  paletteId = 'default_palette',
  overrides: Partial<ColorPaletteModel> = {},
): ColorPaletteModel {
  return {
    paletteId,
    paletteName: `Palette ${paletteId}`,
    backgroundColors: {},
    foregroundColors: {},
    signalColors: {},
    wireColors: {},
    boardColors: {},
    componentColors: {},
    futureThemeHints: {},
    ...overrides,
  };
}

export function createDefaultComponentStyleModel(
  styleId = 'default_style',
  overrides: Partial<ComponentStyleModel> = {},
): ComponentStyleModel {
  return {
    styleId,
    componentType: 'DEFAULT',
    styleMetadata: {},
    interactionMetadata: {},
    futureAnimationHints: {},
    ...overrides,
  };
}

export function createDefaultWorkspaceStyleModel(
  workspaceStyleId = 'default_workspace_style',
  overrides: Partial<WorkspaceStyleModel> = {},
): WorkspaceStyleModel {
  return {
    workspaceStyleId,
    workspaceType: 'BREADBOARD',
    workspaceColors: {},
    workspaceGridMetadata: {},
    workspaceLayoutMetadata: {},
    futureThemeHints: {},
    ...overrides,
  };
}

const VALID_VISIBILITY_STATES: VisibilityState[] = [
  'VISIBLE', 'HIDDEN', 'PARENT_HIDDEN',
];

export function validateThemeModel(
  model: ThemeModel,
  warnPrefix = '[VisualThemes]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_THEME', message: 'Theme model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.themeId) {
    warnings.push({ code: 'INVALID_THEME_ID', message: 'Theme ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.themeName) {
    warnings.push({ code: 'INVALID_THEME_NAME', message: `Theme "${model.themeId}" has empty themeName.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.themeCategory) {
    warnings.push({ code: 'INVALID_THEME_CATEGORY', message: `Theme "${model.themeId}" has empty themeCategory.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.themeVersion) {
    warnings.push({ code: 'INVALID_THEME_VERSION', message: `Theme "${model.themeId}" has empty themeVersion.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.themeState) {
    warnings.push({ code: 'INVALID_THEME_STATE', message: `Theme "${model.themeId}" has empty themeState.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_VISIBILITY_STATES.includes(model.visibilityState)) {
    warnings.push({ code: 'INVALID_VISIBILITY_STATE', message: `Theme "${model.themeId}" has invalid visibilityState "${model.visibilityState}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureRendererHints !== 'object' || model.futureRendererHints === null || Array.isArray(model.futureRendererHints)) {
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `Theme "${model.themeId}" has invalid futureRendererHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateColorPaletteModel(
  palette: ColorPaletteModel,
  warnPrefix = '[VisualThemes]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!palette || typeof palette !== 'object') {
    warnings.push({ code: 'INVALID_COLOR_PALETTE', message: 'Color palette model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!palette.paletteId) {
    warnings.push({ code: 'INVALID_PALETTE_ID', message: 'Color palette ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!palette.paletteName) {
    warnings.push({ code: 'INVALID_PALETTE_NAME', message: `Color palette "${palette.paletteId}" has empty paletteName.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof palette.backgroundColors !== 'object' || palette.backgroundColors === null || Array.isArray(palette.backgroundColors)) {
    warnings.push({ code: 'INVALID_BACKGROUND_COLORS', message: `Color palette "${palette.paletteId}" has invalid backgroundColors.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof palette.foregroundColors !== 'object' || palette.foregroundColors === null || Array.isArray(palette.foregroundColors)) {
    warnings.push({ code: 'INVALID_FOREGROUND_COLORS', message: `Color palette "${palette.paletteId}" has invalid foregroundColors.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof palette.signalColors !== 'object' || palette.signalColors === null || Array.isArray(palette.signalColors)) {
    warnings.push({ code: 'INVALID_SIGNAL_COLORS', message: `Color palette "${palette.paletteId}" has invalid signalColors.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof palette.wireColors !== 'object' || palette.wireColors === null || Array.isArray(palette.wireColors)) {
    warnings.push({ code: 'INVALID_WIRE_COLORS', message: `Color palette "${palette.paletteId}" has invalid wireColors.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof palette.boardColors !== 'object' || palette.boardColors === null || Array.isArray(palette.boardColors)) {
    warnings.push({ code: 'INVALID_BOARD_COLORS', message: `Color palette "${palette.paletteId}" has invalid boardColors.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof palette.componentColors !== 'object' || palette.componentColors === null || Array.isArray(palette.componentColors)) {
    warnings.push({ code: 'INVALID_COMPONENT_COLORS', message: `Color palette "${palette.paletteId}" has invalid componentColors.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof palette.futureThemeHints !== 'object' || palette.futureThemeHints === null || Array.isArray(palette.futureThemeHints)) {
    warnings.push({ code: 'INVALID_FUTURE_THEME_HINTS', message: `Color palette "${palette.paletteId}" has invalid futureThemeHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateComponentStyleModel(
  style: ComponentStyleModel,
  warnPrefix = '[VisualThemes]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!style || typeof style !== 'object') {
    warnings.push({ code: 'INVALID_COMPONENT_STYLE', message: 'Component style model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!style.styleId) {
    warnings.push({ code: 'INVALID_STYLE_ID', message: 'Component style ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!style.componentType) {
    warnings.push({ code: 'INVALID_COMPONENT_TYPE', message: `Component style "${style.styleId}" has empty componentType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof style.styleMetadata !== 'object' || style.styleMetadata === null || Array.isArray(style.styleMetadata)) {
    warnings.push({ code: 'INVALID_STYLE_METADATA', message: `Component style "${style.styleId}" has invalid styleMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof style.interactionMetadata !== 'object' || style.interactionMetadata === null || Array.isArray(style.interactionMetadata)) {
    warnings.push({ code: 'INVALID_INTERACTION_METADATA', message: `Component style "${style.styleId}" has invalid interactionMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof style.futureAnimationHints !== 'object' || style.futureAnimationHints === null || Array.isArray(style.futureAnimationHints)) {
    warnings.push({ code: 'INVALID_FUTURE_ANIMATION_HINTS', message: `Component style "${style.styleId}" has invalid futureAnimationHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateWorkspaceStyleModel(
  ws: WorkspaceStyleModel,
  warnPrefix = '[VisualThemes]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!ws || typeof ws !== 'object') {
    warnings.push({ code: 'INVALID_WORKSPACE_STYLE', message: 'Workspace style model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!ws.workspaceStyleId) {
    warnings.push({ code: 'INVALID_WORKSPACE_STYLE_ID', message: 'Workspace style ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!ws.workspaceType) {
    warnings.push({ code: 'INVALID_WORKSPACE_TYPE', message: `Workspace style "${ws.workspaceStyleId}" has empty workspaceType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof ws.workspaceColors !== 'object' || ws.workspaceColors === null || Array.isArray(ws.workspaceColors)) {
    warnings.push({ code: 'INVALID_WORKSPACE_COLORS', message: `Workspace style "${ws.workspaceStyleId}" has invalid workspaceColors.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof ws.workspaceGridMetadata !== 'object' || ws.workspaceGridMetadata === null || Array.isArray(ws.workspaceGridMetadata)) {
    warnings.push({ code: 'INVALID_WORKSPACE_GRID_METADATA', message: `Workspace style "${ws.workspaceStyleId}" has invalid workspaceGridMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof ws.workspaceLayoutMetadata !== 'object' || ws.workspaceLayoutMetadata === null || Array.isArray(ws.workspaceLayoutMetadata)) {
    warnings.push({ code: 'INVALID_WORKSPACE_LAYOUT_METADATA', message: `Workspace style "${ws.workspaceStyleId}" has invalid workspaceLayoutMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof ws.futureThemeHints !== 'object' || ws.futureThemeHints === null || Array.isArray(ws.futureThemeHints)) {
    warnings.push({ code: 'INVALID_FUTURE_THEME_HINTS', message: `Workspace style "${ws.workspaceStyleId}" has invalid futureThemeHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateDuplicateThemeIds(
  models: ThemeModel[],
  warnPrefix = '[VisualThemes]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.themeId)) {
      warnings.push({ code: 'DUPLICATE_THEME_ID', message: `Duplicate theme ID "${model.themeId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.themeId);
  }
  return warnings;
}

export function validateDuplicateColorPaletteIds(
  palettes: ColorPaletteModel[],
  warnPrefix = '[VisualThemes]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(palettes)) return warnings;
  const seen = new Set<string>();
  for (const p of palettes) {
    if (seen.has(p.paletteId)) {
      warnings.push({ code: 'DUPLICATE_PALETTE_ID', message: `Duplicate color palette ID "${p.paletteId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(p.paletteId);
  }
  return warnings;
}

export function validateDuplicateComponentStyleIds(
  styles: ComponentStyleModel[],
  warnPrefix = '[VisualThemes]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(styles)) return warnings;
  const seen = new Set<string>();
  for (const s of styles) {
    if (seen.has(s.styleId)) {
      warnings.push({ code: 'DUPLICATE_STYLE_ID', message: `Duplicate component style ID "${s.styleId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(s.styleId);
  }
  return warnings;
}

export function validateDuplicateWorkspaceStyleIds(
  styles: WorkspaceStyleModel[],
  warnPrefix = '[VisualThemes]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(styles)) return warnings;
  const seen = new Set<string>();
  for (const s of styles) {
    if (seen.has(s.workspaceStyleId)) {
      warnings.push({ code: 'DUPLICATE_WORKSPACE_STYLE_ID', message: `Duplicate workspace style ID "${s.workspaceStyleId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(s.workspaceStyleId);
  }
  return warnings;
}

export class ThemeSynchronizer {
  private readonly themeRegistry = new RenderRegistry<ThemeModel>();
  private readonly colorPaletteRegistry = new RenderRegistry<ColorPaletteModel>();
  private readonly componentStyleRegistry = new RenderRegistry<ComponentStyleModel>();
  private readonly workspaceStyleRegistry = new RenderRegistry<WorkspaceStyleModel>();

  private readonly warnPrefix = '[ThemeSynchronizer]';

  public get themes(): RenderRegistry<ThemeModel> {
    return this.themeRegistry;
  }

  public get colorPalettes(): RenderRegistry<ColorPaletteModel> {
    return this.colorPaletteRegistry;
  }

  public get componentStyles(): RenderRegistry<ComponentStyleModel> {
    return this.componentStyleRegistry;
  }

  public get workspaceStyles(): RenderRegistry<WorkspaceStyleModel> {
    return this.workspaceStyleRegistry;
  }

  public buildSnapshot(
    themeModels: ThemeModel[] = [],
    colorPaletteModels: ColorPaletteModel[] = [],
    componentStyleModels: ComponentStyleModel[] = [],
    workspaceStyleModels: WorkspaceStyleModel[] = [],
  ): ThemeSnapshot {
    validateDuplicateThemeIds(themeModels, this.warnPrefix);
    validateDuplicateColorPaletteIds(colorPaletteModels, this.warnPrefix);
    validateDuplicateComponentStyleIds(componentStyleModels, this.warnPrefix);
    validateDuplicateWorkspaceStyleIds(workspaceStyleModels, this.warnPrefix);

    for (const model of themeModels) {
      validateThemeModel(model, this.warnPrefix);
      this.themeRegistry.register(model.themeId, model, this.warnPrefix);
    }

    for (const palette of colorPaletteModels) {
      validateColorPaletteModel(palette, this.warnPrefix);
      this.colorPaletteRegistry.register(palette.paletteId, palette, this.warnPrefix);
    }

    for (const style of componentStyleModels) {
      validateComponentStyleModel(style, this.warnPrefix);
      this.componentStyleRegistry.register(style.styleId, style, this.warnPrefix);
    }

    for (const ws of workspaceStyleModels) {
      validateWorkspaceStyleModel(ws, this.warnPrefix);
      this.workspaceStyleRegistry.register(ws.workspaceStyleId, ws, this.warnPrefix);
    }

    return {
      themeModels: safeDeepCopy(themeModels),
      colorPaletteModels: safeDeepCopy(colorPaletteModels),
      componentStyleModels: safeDeepCopy(componentStyleModels),
      workspaceStyleModels: safeDeepCopy(workspaceStyleModels),
    };
  }

  public clear(): void {
    this.themeRegistry.clear();
    this.colorPaletteRegistry.clear();
    this.componentStyleRegistry.clear();
    this.workspaceStyleRegistry.clear();
  }

  public clone(): ThemeSynchronizer {
    const cloned = new ThemeSynchronizer();
    cloned.themeRegistry.fromJSON(this.themeRegistry.getAll(), t => t.themeId, this.warnPrefix);
    cloned.colorPaletteRegistry.fromJSON(this.colorPaletteRegistry.getAll(), p => p.paletteId, this.warnPrefix);
    cloned.componentStyleRegistry.fromJSON(this.componentStyleRegistry.getAll(), s => s.styleId, this.warnPrefix);
    cloned.workspaceStyleRegistry.fromJSON(this.workspaceStyleRegistry.getAll(), w => w.workspaceStyleId, this.warnPrefix);
    return cloned;
  }

  public toJSON(): {
    themeModels: ThemeModel[];
    colorPaletteModels: ColorPaletteModel[];
    componentStyleModels: ComponentStyleModel[];
    workspaceStyleModels: WorkspaceStyleModel[];
  } {
    return {
      themeModels: this.themeRegistry.getAll(),
      colorPaletteModels: this.colorPaletteRegistry.getAll(),
      componentStyleModels: this.componentStyleRegistry.getAll(),
      workspaceStyleModels: this.workspaceStyleRegistry.getAll(),
    };
  }

  public fromJSON(data: {
    themeModels?: ThemeModel[];
    colorPaletteModels?: ColorPaletteModel[];
    componentStyleModels?: ComponentStyleModel[];
    workspaceStyleModels?: WorkspaceStyleModel[];
  }): void {
    this.clear();
    if (Array.isArray(data.themeModels)) {
      for (const model of data.themeModels) {
        this.themeRegistry.register(model.themeId, model, this.warnPrefix);
      }
    }
    if (Array.isArray(data.colorPaletteModels)) {
      for (const palette of data.colorPaletteModels) {
        this.colorPaletteRegistry.register(palette.paletteId, palette, this.warnPrefix);
      }
    }
    if (Array.isArray(data.componentStyleModels)) {
      for (const style of data.componentStyleModels) {
        this.componentStyleRegistry.register(style.styleId, style, this.warnPrefix);
      }
    }
    if (Array.isArray(data.workspaceStyleModels)) {
      for (const ws of data.workspaceStyleModels) {
        this.workspaceStyleRegistry.register(ws.workspaceStyleId, ws, this.warnPrefix);
      }
    }
  }

  public sync(data: {
    themeModels?: ThemeModel[];
    colorPaletteModels?: ColorPaletteModel[];
    componentStyleModels?: ComponentStyleModel[];
    workspaceStyleModels?: WorkspaceStyleModel[];
  }): void {
    this.fromJSON(data);
  }
}
