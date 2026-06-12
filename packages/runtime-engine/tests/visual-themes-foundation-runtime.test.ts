import { describe, it, expect } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { ThemeModel, ColorPaletteModel, ComponentStyleModel, WorkspaceStyleModel, StageState } from '../src/types';
import {
  createDefaultThemeModel,
  createDefaultColorPaletteModel,
  createDefaultComponentStyleModel,
  createDefaultWorkspaceStyleModel,
  validateThemeModel,
  validateColorPaletteModel,
  validateComponentStyleModel,
  validateWorkspaceStyleModel,
  validateDuplicateThemeIds,
  validateDuplicateColorPaletteIds,
  validateDuplicateComponentStyleIds,
  validateDuplicateWorkspaceStyleIds,
  ThemeSynchronizer,
} from '../src/stage';
import { resetThreadCounter } from '../src/runtime/execution-context';

function makeStage(overrides: Partial<StageState> = {}): StageState {
  return {
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
    ...overrides,
  };
}

function runtime(): BaseRuntime {
  const rt = new BaseRuntime();
  rt.initialize();
  resetThreadCounter();
  rt.addTarget(makeStage());
  return rt;
}

function theme(i: number, id?: string, overrides: Partial<ThemeModel> = {}): ThemeModel {
  return createDefaultThemeModel(id || `theme_${i}`, {
    themeName: `Theme ${i}`,
    themeCategory: 'DEFAULT',
    themeVersion: '1.0.0',
    themeState: 'ACTIVE',
    visibilityState: 'VISIBLE',
    futureRendererHints: {},
    ...overrides,
  });
}

function palette(i: number, id?: string, overrides: Partial<ColorPaletteModel> = {}): ColorPaletteModel {
  return createDefaultColorPaletteModel(id || `palette_${i}`, {
    paletteName: `Palette ${i}`,
    backgroundColors: {},
    foregroundColors: {},
    signalColors: {},
    wireColors: {},
    boardColors: {},
    componentColors: {},
    futureThemeHints: {},
    ...overrides,
  });
}

function compStyle(i: number, id?: string, overrides: Partial<ComponentStyleModel> = {}): ComponentStyleModel {
  return createDefaultComponentStyleModel(id || `style_${i}`, {
    componentType: 'DEFAULT',
    styleMetadata: {},
    interactionMetadata: {},
    futureAnimationHints: {},
    ...overrides,
  });
}

function wsStyle(i: number, id?: string, overrides: Partial<WorkspaceStyleModel> = {}): WorkspaceStyleModel {
  return createDefaultWorkspaceStyleModel(id || `ws_style_${i}`, {
    workspaceType: 'BREADBOARD',
    workspaceColors: {},
    workspaceGridMetadata: {},
    workspaceLayoutMetadata: {},
    futureThemeHints: {},
    ...overrides,
  });
}

describe('Phase 13B: Visual Themes Foundation Runtime Tests', () => {

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: CRUD Operations
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 1: Theme Model CRUD', () => {
    for (let i = 0; i < 100; i++) {
      it(`registers and retrieves theme model ${i}`, () => {
        const rt = runtime();
        rt.registerThemeModel(theme(i));
        const result = rt.getThemeModel(`theme_${i}`);
        expect(result).toBeDefined();
        expect(result!.themeId).toBe(`theme_${i}`);
        expect(result!.themeName).toBe(`Theme ${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`getThemeModels returns ordered array ${i}`, () => {
        const rt = runtime();
        rt.registerThemeModel(theme(i, `a_${i}`));
        rt.registerThemeModel(theme(i, `b_${i}`));
        const all = rt.getThemeModels();
        expect(all.length).toBe(2);
        expect(all[0].themeId).toBe(`a_${i}`);
        expect(all[1].themeId).toBe(`b_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`updates theme model ${i}`, () => {
        const rt = runtime();
        rt.registerThemeModel(theme(i));
        rt.updateThemeModel(`theme_${i}`, { themeName: 'Updated' });
        const result = rt.getThemeModel(`theme_${i}`);
        expect(result!.themeName).toBe('Updated');
        expect(result!.themeId).toBe(`theme_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`removes theme model ${i}`, () => {
        const rt = runtime();
        rt.registerThemeModel(theme(i));
        rt.removeThemeModel(`theme_${i}`);
        expect(rt.getThemeModel(`theme_${i}`)).toBeUndefined();
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`clears all theme models ${i}`, () => {
        const rt = runtime();
        rt.registerThemeModel(theme(i, `a_${i}`));
        rt.registerThemeModel(theme(i, `b_${i}`));
        rt.clearThemeModels();
        expect(rt.getThemeModels().length).toBe(0);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`getThemeModelKeys returns ordered keys ${i}`, () => {
        const rt = runtime();
        rt.registerThemeModel(theme(i, `k1_${i}`));
        rt.registerThemeModel(theme(i, `k2_${i}`));
        const keys = rt.getThemeModelKeys();
        expect(keys).toEqual([`k1_${i}`, `k2_${i}`]);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`hasThemeModel returns correct boolean ${i}`, () => {
        const rt = runtime();
        expect(rt.hasThemeModel(`theme_${i}`)).toBe(false);
        rt.registerThemeModel(theme(i));
        expect(rt.hasThemeModel(`theme_${i}`)).toBe(true);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`get returns undefined after remove ${i}`, () => {
        const rt = runtime();
        rt.registerThemeModel(theme(i));
        rt.removeThemeModel(`theme_${i}`);
        expect(rt.hasThemeModel(`theme_${i}`)).toBe(false);
        expect(rt.getThemeModel(`theme_${i}`)).toBeUndefined();
      });
    }
  });

  describe('SECTION 1: Color Palette Model CRUD', () => {
    for (let i = 0; i < 100; i++) {
      it(`registers and retrieves color palette model ${i}`, () => {
        const rt = runtime();
        rt.registerColorPaletteModel(palette(i));
        const result = rt.getColorPaletteModel(`palette_${i}`);
        expect(result).toBeDefined();
        expect(result!.paletteId).toBe(`palette_${i}`);
        expect(result!.paletteName).toBe(`Palette ${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`getColorPaletteModels returns ordered array ${i}`, () => {
        const rt = runtime();
        rt.registerColorPaletteModel(palette(i, `pa_${i}`));
        rt.registerColorPaletteModel(palette(i, `pb_${i}`));
        const all = rt.getColorPaletteModels();
        expect(all.length).toBe(2);
        expect(all[0].paletteId).toBe(`pa_${i}`);
        expect(all[1].paletteId).toBe(`pb_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`updates color palette model ${i}`, () => {
        const rt = runtime();
        rt.registerColorPaletteModel(palette(i));
        rt.updateColorPaletteModel(`palette_${i}`, { paletteName: 'Updated Palette' });
        const result = rt.getColorPaletteModel(`palette_${i}`);
        expect(result!.paletteName).toBe('Updated Palette');
        expect(result!.paletteId).toBe(`palette_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`removes color palette model ${i}`, () => {
        const rt = runtime();
        rt.registerColorPaletteModel(palette(i));
        rt.removeColorPaletteModel(`palette_${i}`);
        expect(rt.getColorPaletteModel(`palette_${i}`)).toBeUndefined();
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`clears all color palette models ${i}`, () => {
        const rt = runtime();
        rt.registerColorPaletteModel(palette(i, `ca_${i}`));
        rt.registerColorPaletteModel(palette(i, `cb_${i}`));
        rt.clearColorPaletteModels();
        expect(rt.getColorPaletteModels().length).toBe(0);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`getColorPaletteModelKeys returns ordered keys ${i}`, () => {
        const rt = runtime();
        rt.registerColorPaletteModel(palette(i, `pk1_${i}`));
        rt.registerColorPaletteModel(palette(i, `pk2_${i}`));
        const keys = rt.getColorPaletteModelKeys();
        expect(keys).toEqual([`pk1_${i}`, `pk2_${i}`]);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`hasColorPaletteModel returns correct boolean ${i}`, () => {
        const rt = runtime();
        expect(rt.hasColorPaletteModel(`palette_${i}`)).toBe(false);
        rt.registerColorPaletteModel(palette(i));
        expect(rt.hasColorPaletteModel(`palette_${i}`)).toBe(true);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`get returns undefined after remove ${i}`, () => {
        const rt = runtime();
        rt.registerColorPaletteModel(palette(i));
        rt.removeColorPaletteModel(`palette_${i}`);
        expect(rt.hasColorPaletteModel(`palette_${i}`)).toBe(false);
      });
    }
  });

  describe('SECTION 1: Component Style Model CRUD', () => {
    for (let i = 0; i < 100; i++) {
      it(`registers and retrieves component style model ${i}`, () => {
        const rt = runtime();
        rt.registerComponentStyleModel(compStyle(i));
        const result = rt.getComponentStyleModel(`style_${i}`);
        expect(result).toBeDefined();
        expect(result!.styleId).toBe(`style_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`getComponentStyleModels returns ordered array ${i}`, () => {
        const rt = runtime();
        rt.registerComponentStyleModel(compStyle(i, `sa_${i}`));
        rt.registerComponentStyleModel(compStyle(i, `sb_${i}`));
        const all = rt.getComponentStyleModels();
        expect(all.length).toBe(2);
        expect(all[0].styleId).toBe(`sa_${i}`);
        expect(all[1].styleId).toBe(`sb_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`updates component style model ${i}`, () => {
        const rt = runtime();
        rt.registerComponentStyleModel(compStyle(i));
        rt.updateComponentStyleModel(`style_${i}`, { componentType: 'RESISTOR' });
        const result = rt.getComponentStyleModel(`style_${i}`);
        expect(result!.componentType).toBe('RESISTOR');
        expect(result!.styleId).toBe(`style_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`removes component style model ${i}`, () => {
        const rt = runtime();
        rt.registerComponentStyleModel(compStyle(i));
        rt.removeComponentStyleModel(`style_${i}`);
        expect(rt.getComponentStyleModel(`style_${i}`)).toBeUndefined();
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`clears all component style models ${i}`, () => {
        const rt = runtime();
        rt.registerComponentStyleModel(compStyle(i, `csa_${i}`));
        rt.registerComponentStyleModel(compStyle(i, `csb_${i}`));
        rt.clearComponentStyleModels();
        expect(rt.getComponentStyleModels().length).toBe(0);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`getComponentStyleModelKeys returns ordered keys ${i}`, () => {
        const rt = runtime();
        rt.registerComponentStyleModel(compStyle(i, `sk1_${i}`));
        rt.registerComponentStyleModel(compStyle(i, `sk2_${i}`));
        const keys = rt.getComponentStyleModelKeys();
        expect(keys).toEqual([`sk1_${i}`, `sk2_${i}`]);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`hasComponentStyleModel returns correct boolean ${i}`, () => {
        const rt = runtime();
        expect(rt.hasComponentStyleModel(`style_${i}`)).toBe(false);
        rt.registerComponentStyleModel(compStyle(i));
        expect(rt.hasComponentStyleModel(`style_${i}`)).toBe(true);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`get returns undefined after remove ${i}`, () => {
        const rt = runtime();
        rt.registerComponentStyleModel(compStyle(i));
        rt.removeComponentStyleModel(`style_${i}`);
        expect(rt.hasComponentStyleModel(`style_${i}`)).toBe(false);
      });
    }
  });

  describe('SECTION 1: Workspace Style Model CRUD', () => {
    for (let i = 0; i < 100; i++) {
      it(`registers and retrieves workspace style model ${i}`, () => {
        const rt = runtime();
        rt.registerWorkspaceStyleModel(wsStyle(i));
        const result = rt.getWorkspaceStyleModel(`ws_style_${i}`);
        expect(result).toBeDefined();
        expect(result!.workspaceStyleId).toBe(`ws_style_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`getWorkspaceStyleModels returns ordered array ${i}`, () => {
        const rt = runtime();
        rt.registerWorkspaceStyleModel(wsStyle(i, `wa_${i}`));
        rt.registerWorkspaceStyleModel(wsStyle(i, `wb_${i}`));
        const all = rt.getWorkspaceStyleModels();
        expect(all.length).toBe(2);
        expect(all[0].workspaceStyleId).toBe(`wa_${i}`);
        expect(all[1].workspaceStyleId).toBe(`wb_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`updates workspace style model ${i}`, () => {
        const rt = runtime();
        rt.registerWorkspaceStyleModel(wsStyle(i));
        rt.updateWorkspaceStyleModel(`ws_style_${i}`, { workspaceType: 'SCHEMATIC' });
        const result = rt.getWorkspaceStyleModel(`ws_style_${i}`);
        expect(result!.workspaceType).toBe('SCHEMATIC');
        expect(result!.workspaceStyleId).toBe(`ws_style_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`removes workspace style model ${i}`, () => {
        const rt = runtime();
        rt.registerWorkspaceStyleModel(wsStyle(i));
        rt.removeWorkspaceStyleModel(`ws_style_${i}`);
        expect(rt.getWorkspaceStyleModel(`ws_style_${i}`)).toBeUndefined();
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`clears all workspace style models ${i}`, () => {
        const rt = runtime();
        rt.registerWorkspaceStyleModel(wsStyle(i, `wsa_${i}`));
        rt.registerWorkspaceStyleModel(wsStyle(i, `wsb_${i}`));
        rt.clearWorkspaceStyleModels();
        expect(rt.getWorkspaceStyleModels().length).toBe(0);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`getWorkspaceStyleModelKeys returns ordered keys ${i}`, () => {
        const rt = runtime();
        rt.registerWorkspaceStyleModel(wsStyle(i, `wk1_${i}`));
        rt.registerWorkspaceStyleModel(wsStyle(i, `wk2_${i}`));
        const keys = rt.getWorkspaceStyleModelKeys();
        expect(keys).toEqual([`wk1_${i}`, `wk2_${i}`]);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`hasWorkspaceStyleModel returns correct boolean ${i}`, () => {
        const rt = runtime();
        expect(rt.hasWorkspaceStyleModel(`ws_style_${i}`)).toBe(false);
        rt.registerWorkspaceStyleModel(wsStyle(i));
        expect(rt.hasWorkspaceStyleModel(`ws_style_${i}`)).toBe(true);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`get returns undefined after remove ${i}`, () => {
        const rt = runtime();
        rt.registerWorkspaceStyleModel(wsStyle(i));
        rt.removeWorkspaceStyleModel(`ws_style_${i}`);
        expect(rt.hasWorkspaceStyleModel(`ws_style_${i}`)).toBe(false);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Factory and Default Values
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 2: Factory and Default Values', () => {
    it('createDefaultThemeModel returns correct defaults', () => {
      const model = createDefaultThemeModel('test_theme');
      expect(model.themeId).toBe('test_theme');
      expect(model.themeName).toBe('Theme test_theme');
      expect(model.themeCategory).toBe('DEFAULT');
      expect(model.themeVersion).toBe('1.0.0');
      expect(model.themeState).toBe('ACTIVE');
      expect(model.visibilityState).toBe('VISIBLE');
      expect(model.futureRendererHints).toEqual({});
    });

    it('createDefaultColorPaletteModel returns correct defaults', () => {
      const model = createDefaultColorPaletteModel('test_palette');
      expect(model.paletteId).toBe('test_palette');
      expect(model.paletteName).toBe('Palette test_palette');
      expect(model.backgroundColors).toEqual({});
      expect(model.foregroundColors).toEqual({});
      expect(model.signalColors).toEqual({});
      expect(model.wireColors).toEqual({});
      expect(model.boardColors).toEqual({});
      expect(model.componentColors).toEqual({});
      expect(model.futureThemeHints).toEqual({});
    });

    it('createDefaultComponentStyleModel returns correct defaults', () => {
      const model = createDefaultComponentStyleModel('test_style');
      expect(model.styleId).toBe('test_style');
      expect(model.componentType).toBe('DEFAULT');
      expect(model.styleMetadata).toEqual({});
      expect(model.interactionMetadata).toEqual({});
      expect(model.futureAnimationHints).toEqual({});
    });

    it('createDefaultWorkspaceStyleModel returns correct defaults', () => {
      const model = createDefaultWorkspaceStyleModel('test_ws');
      expect(model.workspaceStyleId).toBe('test_ws');
      expect(model.workspaceType).toBe('BREADBOARD');
      expect(model.workspaceColors).toEqual({});
      expect(model.workspaceGridMetadata).toEqual({});
      expect(model.workspaceLayoutMetadata).toEqual({});
      expect(model.futureThemeHints).toEqual({});
    });

    for (let i = 0; i < 100; i++) {
      it(`createDefaultThemeModel accepts overrides ${i}`, () => {
        const model = createDefaultThemeModel(`ov_${i}`, { themeCategory: `CAT_${i}` });
        expect(model.themeId).toBe(`ov_${i}`);
        expect(model.themeCategory).toBe(`CAT_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`createDefaultColorPaletteModel accepts overrides ${i}`, () => {
        const model = createDefaultColorPaletteModel(`pov_${i}`, { paletteName: `P_${i}` });
        expect(model.paletteId).toBe(`pov_${i}`);
        expect(model.paletteName).toBe(`P_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`createDefaultComponentStyleModel accepts overrides ${i}`, () => {
        const model = createDefaultComponentStyleModel(`sov_${i}`, { componentType: `TYPE_${i}` });
        expect(model.styleId).toBe(`sov_${i}`);
        expect(model.componentType).toBe(`TYPE_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`createDefaultWorkspaceStyleModel accepts overrides ${i}`, () => {
        const model = createDefaultWorkspaceStyleModel(`wsov_${i}`, { workspaceType: `WT_${i}` });
        expect(model.workspaceStyleId).toBe(`wsov_${i}`);
        expect(model.workspaceType).toBe(`WT_${i}`);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Validation
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 3: Validation - ThemeModel', () => {
    it('warns on null theme model', () => {
      const warnings = validateThemeModel(null as any);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty themeId', () => {
      const warnings = validateThemeModel({ ...theme(0), themeId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty themeName', () => {
      const warnings = validateThemeModel({ ...theme(0), themeName: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty themeCategory', () => {
      const warnings = validateThemeModel({ ...theme(0), themeCategory: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty themeVersion', () => {
      const warnings = validateThemeModel({ ...theme(0), themeVersion: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty themeState', () => {
      const warnings = validateThemeModel({ ...theme(0), themeState: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid visibilityState', () => {
      const warnings = validateThemeModel({ ...theme(0), visibilityState: 'INVALID' as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid futureRendererHints', () => {
      const warnings = validateThemeModel({ ...theme(0), futureRendererHints: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('valid theme model produces no warnings', () => {
      const warnings = validateThemeModel(theme(0));
      expect(warnings.length).toBe(0);
    });
  });

  describe('SECTION 3: Validation - ColorPaletteModel', () => {
    it('warns on null palette model', () => {
      const warnings = validateColorPaletteModel(null as any);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty paletteId', () => {
      const warnings = validateColorPaletteModel({ ...palette(0), paletteId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty paletteName', () => {
      const warnings = validateColorPaletteModel({ ...palette(0), paletteName: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid backgroundColors', () => {
      const warnings = validateColorPaletteModel({ ...palette(0), backgroundColors: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid foregroundColors', () => {
      const warnings = validateColorPaletteModel({ ...palette(0), foregroundColors: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid signalColors', () => {
      const warnings = validateColorPaletteModel({ ...palette(0), signalColors: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid wireColors', () => {
      const warnings = validateColorPaletteModel({ ...palette(0), wireColors: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid boardColors', () => {
      const warnings = validateColorPaletteModel({ ...palette(0), boardColors: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid componentColors', () => {
      const warnings = validateColorPaletteModel({ ...palette(0), componentColors: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid futureThemeHints', () => {
      const warnings = validateColorPaletteModel({ ...palette(0), futureThemeHints: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('valid palette model produces no warnings', () => {
      const warnings = validateColorPaletteModel(palette(0));
      expect(warnings.length).toBe(0);
    });
  });

  describe('SECTION 3: Validation - ComponentStyleModel', () => {
    it('warns on null style model', () => {
      const warnings = validateComponentStyleModel(null as any);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty styleId', () => {
      const warnings = validateComponentStyleModel({ ...compStyle(0), styleId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty componentType', () => {
      const warnings = validateComponentStyleModel({ ...compStyle(0), componentType: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid styleMetadata', () => {
      const warnings = validateComponentStyleModel({ ...compStyle(0), styleMetadata: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid interactionMetadata', () => {
      const warnings = validateComponentStyleModel({ ...compStyle(0), interactionMetadata: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid futureAnimationHints', () => {
      const warnings = validateComponentStyleModel({ ...compStyle(0), futureAnimationHints: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('valid component style model produces no warnings', () => {
      const warnings = validateComponentStyleModel(compStyle(0));
      expect(warnings.length).toBe(0);
    });
  });

  describe('SECTION 3: Validation - WorkspaceStyleModel', () => {
    it('warns on null workspace style model', () => {
      const warnings = validateWorkspaceStyleModel(null as any);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty workspaceStyleId', () => {
      const warnings = validateWorkspaceStyleModel({ ...wsStyle(0), workspaceStyleId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty workspaceType', () => {
      const warnings = validateWorkspaceStyleModel({ ...wsStyle(0), workspaceType: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid workspaceColors', () => {
      const warnings = validateWorkspaceStyleModel({ ...wsStyle(0), workspaceColors: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid workspaceGridMetadata', () => {
      const warnings = validateWorkspaceStyleModel({ ...wsStyle(0), workspaceGridMetadata: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid workspaceLayoutMetadata', () => {
      const warnings = validateWorkspaceStyleModel({ ...wsStyle(0), workspaceLayoutMetadata: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid futureThemeHints', () => {
      const warnings = validateWorkspaceStyleModel({ ...wsStyle(0), futureThemeHints: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('valid workspace style model produces no warnings', () => {
      const warnings = validateWorkspaceStyleModel(wsStyle(0));
      expect(warnings.length).toBe(0);
    });
  });

  describe('SECTION 3: Duplicate Validators', () => {
    it('detects duplicate theme IDs', () => {
      const warnings = validateDuplicateThemeIds([theme(0, 'dup'), theme(1, 'dup')]);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('detects duplicate color palette IDs', () => {
      const warnings = validateDuplicateColorPaletteIds([palette(0, 'dup'), palette(1, 'dup')]);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('detects duplicate component style IDs', () => {
      const warnings = validateDuplicateComponentStyleIds([compStyle(0, 'dup'), compStyle(1, 'dup')]);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('detects duplicate workspace style IDs', () => {
      const warnings = validateDuplicateWorkspaceStyleIds([wsStyle(0, 'dup'), wsStyle(1, 'dup')]);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('no warnings for unique theme IDs', () => {
      const warnings = validateDuplicateThemeIds([theme(0, 'a'), theme(1, 'b')]);
      expect(warnings.length).toBe(0);
    });

    it('no warnings for unique palette IDs', () => {
      const warnings = validateDuplicateColorPaletteIds([palette(0, 'a'), palette(1, 'b')]);
      expect(warnings.length).toBe(0);
    });

    it('no warnings for unique style IDs', () => {
      const warnings = validateDuplicateComponentStyleIds([compStyle(0, 'a'), compStyle(1, 'b')]);
      expect(warnings.length).toBe(0);
    });

    it('no warnings for unique workspace style IDs', () => {
      const warnings = validateDuplicateWorkspaceStyleIds([wsStyle(0, 'a'), wsStyle(1, 'b')]);
      expect(warnings.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: ThemeSynchronizer
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 4: ThemeSynchronizer', () => {
    for (let i = 0; i < 100; i++) {
      it(`buildSnapshot deep-copies theme models ${i}`, () => {
        const sync = new ThemeSynchronizer();
        const snapshot = sync.buildSnapshot([theme(i)], [palette(i)], [compStyle(i)], [wsStyle(i)]);
        expect(snapshot.themeModels.length).toBe(1);
        expect(snapshot.colorPaletteModels.length).toBe(1);
        expect(snapshot.componentStyleModels.length).toBe(1);
        expect(snapshot.workspaceStyleModels.length).toBe(1);
        expect(snapshot.themeModels[0].themeId).toBe(`theme_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`clear removes all entries ${i}`, () => {
        const sync = new ThemeSynchronizer();
        sync.buildSnapshot([theme(i)], [palette(i)], [compStyle(i)], [wsStyle(i)]);
        sync.clear();
        expect(sync.themes.getAll().length).toBe(0);
        expect(sync.colorPalettes.getAll().length).toBe(0);
        expect(sync.componentStyles.getAll().length).toBe(0);
        expect(sync.workspaceStyles.getAll().length).toBe(0);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`clone produces independent copy ${i}`, () => {
        const sync = new ThemeSynchronizer();
        sync.buildSnapshot([theme(i)], [palette(i)], [compStyle(i)], [wsStyle(i)]);
        const cloned = sync.clone();
        sync.clear();
        expect(cloned.themes.getAll().length).toBe(1);
        expect(cloned.colorPalettes.getAll().length).toBe(1);
        expect(cloned.componentStyles.getAll().length).toBe(1);
        expect(cloned.workspaceStyles.getAll().length).toBe(1);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`toJSON returns serializable data ${i}`, () => {
        const sync = new ThemeSynchronizer();
        sync.buildSnapshot([theme(i)], [palette(i)], [compStyle(i)], [wsStyle(i)]);
        const json = sync.toJSON();
        expect(json.themeModels.length).toBe(1);
        expect(json.colorPaletteModels.length).toBe(1);
        expect(json.componentStyleModels.length).toBe(1);
        expect(json.workspaceStyleModels.length).toBe(1);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`fromJSON restores data ${i}`, () => {
        const sync = new ThemeSynchronizer();
        sync.fromJSON({
          themeModels: [theme(i)],
          colorPaletteModels: [palette(i)],
          componentStyleModels: [compStyle(i)],
          workspaceStyleModels: [wsStyle(i)],
        });
        expect(sync.themes.getAll().length).toBe(1);
        expect(sync.colorPalettes.getAll().length).toBe(1);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`sync replaces existing data ${i}`, () => {
        const sync = new ThemeSynchronizer();
        sync.buildSnapshot([theme(0, 'old')], [], [], []);
        sync.sync({
          themeModels: [theme(i)],
          colorPaletteModels: [palette(i)],
          componentStyleModels: [compStyle(i)],
          workspaceStyleModels: [wsStyle(i)],
        });
        const themes = sync.themes.getAll();
        expect(themes.length).toBe(1);
        expect(themes[0].themeId).toBe(`theme_${i}`);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: Lifecycle Integration
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 5: Lifecycle Integration', () => {
    for (let i = 0; i < 100; i++) {
      it(`initialize clears visual themes registries ${i}`, () => {
        const rt = runtime();
        rt.registerThemeModel(theme(i));
        rt.registerColorPaletteModel(palette(i));
        rt.registerComponentStyleModel(compStyle(i));
        rt.registerWorkspaceStyleModel(wsStyle(i));
        rt.initialize();
        expect(rt.getThemeModels().length).toBe(0);
        expect(rt.getColorPaletteModels().length).toBe(0);
        expect(rt.getComponentStyleModels().length).toBe(0);
        expect(rt.getWorkspaceStyleModels().length).toBe(0);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`stop clears visual themes registries ${i}`, () => {
        const rt = runtime();
        rt.registerThemeModel(theme(i));
        rt.registerColorPaletteModel(palette(i));
        rt.registerComponentStyleModel(compStyle(i));
        rt.registerWorkspaceStyleModel(wsStyle(i));
        rt.initialize();
        rt.registerThemeModel(theme(i));
        rt.registerColorPaletteModel(palette(i));
        rt.registerComponentStyleModel(compStyle(i));
        rt.registerWorkspaceStyleModel(wsStyle(i));
        rt.stop();
        expect(rt.getThemeModels().length).toBe(0);
        expect(rt.getColorPaletteModels().length).toBe(0);
        expect(rt.getComponentStyleModels().length).toBe(0);
        expect(rt.getWorkspaceStyleModels().length).toBe(0);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`reset clears visual themes registries ${i}`, () => {
        const rt = runtime();
        rt.registerThemeModel(theme(i));
        rt.registerColorPaletteModel(palette(i));
        rt.registerComponentStyleModel(compStyle(i));
        rt.registerWorkspaceStyleModel(wsStyle(i));
        rt.reset();
        expect(rt.getThemeModels().length).toBe(0);
        expect(rt.getColorPaletteModels().length).toBe(0);
        expect(rt.getComponentStyleModels().length).toBe(0);
        expect(rt.getWorkspaceStyleModels().length).toBe(0);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`destroy clears visual themes registries ${i}`, () => {
        const rt = runtime();
        rt.registerThemeModel(theme(i));
        rt.registerColorPaletteModel(palette(i));
        rt.registerComponentStyleModel(compStyle(i));
        rt.registerWorkspaceStyleModel(wsStyle(i));
        rt.destroy();
        expect(rt.getThemeModels().length).toBe(0);
        expect(rt.getColorPaletteModels().length).toBe(0);
        expect(rt.getComponentStyleModels().length).toBe(0);
        expect(rt.getWorkspaceStyleModels().length).toBe(0);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: Stage Snapshot Synchronization
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 6: Stage Snapshot Synchronization', () => {
    for (let i = 0; i < 100; i++) {
      it(`themes appear in stage snapshot ${i}`, () => {
        const rt = runtime();
        rt.registerThemeModel(theme(i));
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        expect(stageSnap!.themeModels).toBeDefined();
        expect(stageSnap!.themeModels!.length).toBe(1);
        expect(stageSnap!.themeModels![0].themeId).toBe(`theme_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`color palettes appear in stage snapshot ${i}`, () => {
        const rt = runtime();
        rt.registerColorPaletteModel(palette(i));
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        expect(stageSnap!.colorPaletteModels).toBeDefined();
        expect(stageSnap!.colorPaletteModels!.length).toBe(1);
        expect(stageSnap!.colorPaletteModels![0].paletteId).toBe(`palette_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`component styles appear in stage snapshot ${i}`, () => {
        const rt = runtime();
        rt.registerComponentStyleModel(compStyle(i));
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        expect(stageSnap!.componentStyleModels).toBeDefined();
        expect(stageSnap!.componentStyleModels!.length).toBe(1);
        expect(stageSnap!.componentStyleModels![0].styleId).toBe(`style_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`workspace styles appear in stage snapshot ${i}`, () => {
        const rt = runtime();
        rt.registerWorkspaceStyleModel(wsStyle(i));
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        expect(stageSnap!.workspaceStyleModels).toBeDefined();
        expect(stageSnap!.workspaceStyleModels!.length).toBe(1);
        expect(stageSnap!.workspaceStyleModels![0].workspaceStyleId).toBe(`ws_style_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`empty registries produce no snapshot fields ${i}`, () => {
        const rt = runtime();
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        expect(stageSnap!.themeModels).toBeUndefined();
        expect(stageSnap!.colorPaletteModels).toBeUndefined();
        expect(stageSnap!.componentStyleModels).toBeUndefined();
        expect(stageSnap!.workspaceStyleModels).toBeUndefined();
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: Snapshot Serialization Renderer Isolation Clone Safety
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 7: Snapshot Serialization Renderer Isolation Clone Safety', () => {
    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves theme models ${i}`, () => {
        const rt = runtime();
        rt.registerThemeModel(theme(i));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const result = imported.getThemeModel(`theme_${i}`);
        expect(result).toBeDefined();
        expect(result!.themeId).toBe(`theme_${i}`);
        expect(result!.themeName).toBe(`Theme ${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves color palette models ${i}`, () => {
        const rt = runtime();
        rt.registerColorPaletteModel(palette(i));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const result = imported.getColorPaletteModel(`palette_${i}`);
        expect(result).toBeDefined();
        expect(result!.paletteId).toBe(`palette_${i}`);
        expect(result!.paletteName).toBe(`Palette ${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves component style models ${i}`, () => {
        const rt = runtime();
        rt.registerComponentStyleModel(compStyle(i));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const result = imported.getComponentStyleModel(`style_${i}`);
        expect(result).toBeDefined();
        expect(result!.styleId).toBe(`style_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves workspace style models ${i}`, () => {
        const rt = runtime();
        rt.registerWorkspaceStyleModel(wsStyle(i));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const result = imported.getWorkspaceStyleModel(`ws_style_${i}`);
        expect(result).toBeDefined();
        expect(result!.workspaceStyleId).toBe(`ws_style_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves theme future renderer hints ${i}`, () => {
        const rt = runtime();
        rt.registerThemeModel(theme(i, `hint_t_${i}`, { futureRendererHints: { priority: i } }));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getThemeModel(`hint_t_${i}`)!;
        expect(restored.futureRendererHints.priority).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves palette future theme hints ${i}`, () => {
        const rt = runtime();
        rt.registerColorPaletteModel(palette(i, `hint_p_${i}`, { futureThemeHints: { priority: i } }));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getColorPaletteModel(`hint_p_${i}`)!;
        expect(restored.futureThemeHints.priority).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves component style animation hints ${i}`, () => {
        const rt = runtime();
        rt.registerComponentStyleModel(compStyle(i, `hint_cs_${i}`, { futureAnimationHints: { speed: i } }));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getComponentStyleModel(`hint_cs_${i}`)!;
        expect(restored.futureAnimationHints.speed).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves workspace style future hints ${i}`, () => {
        const rt = runtime();
        rt.registerWorkspaceStyleModel(wsStyle(i, `hint_ws_${i}`, { futureThemeHints: { gridSize: i } }));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getWorkspaceStyleModel(`hint_ws_${i}`)!;
        expect(restored.futureThemeHints.gridSize).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`deep-clone isolation: mutating retrieved theme does not affect registry ${i}`, () => {
        const rt = runtime();
        rt.registerThemeModel(theme(i));
        const retrieved = rt.getThemeModel(`theme_${i}`)!;
        retrieved.themeName = 'MUTATED';
        const fresh = rt.getThemeModel(`theme_${i}`)!;
        expect(fresh.themeName).toBe(`Theme ${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`deep-clone isolation: mutating retrieved palette does not affect registry ${i}`, () => {
        const rt = runtime();
        rt.registerColorPaletteModel(palette(i));
        const retrieved = rt.getColorPaletteModel(`palette_${i}`)!;
        retrieved.paletteName = 'MUTATED';
        const fresh = rt.getColorPaletteModel(`palette_${i}`)!;
        expect(fresh.paletteName).toBe(`Palette ${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`deep-clone isolation: mutating retrieved component style does not affect registry ${i}`, () => {
        const rt = runtime();
        rt.registerComponentStyleModel(compStyle(i));
        const retrieved = rt.getComponentStyleModel(`style_${i}`)!;
        retrieved.componentType = 'MUTATED';
        const fresh = rt.getComponentStyleModel(`style_${i}`)!;
        expect(fresh.componentType).toBe('DEFAULT');
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`deep-clone isolation: mutating retrieved workspace style does not affect registry ${i}`, () => {
        const rt = runtime();
        rt.registerWorkspaceStyleModel(wsStyle(i));
        const retrieved = rt.getWorkspaceStyleModel(`ws_style_${i}`)!;
        retrieved.workspaceType = 'MUTATED';
        const fresh = rt.getWorkspaceStyleModel(`ws_style_${i}`)!;
        expect(fresh.workspaceType).toBe('BREADBOARD');
      });
    }
  });
});
