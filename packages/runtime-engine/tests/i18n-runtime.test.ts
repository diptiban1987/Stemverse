/**
 * Phase 38B — I18n Runtime Tests
 */
import { describe, it, expect } from 'vitest';
import {
  LANGUAGE_REGISTRY, getSupportedLanguages, getLanguageEntry, isRtlLanguage,
  createI18nConfig, switchLanguage, detectLocale,
  createTranslationBundle, translate, translateWithParams, pluralize,
  formatNumber, formatCurrency, formatDate,
  I18nSynchronizer,
} from '../src/stage/i18n-runtime';

describe('Phase 38B: I18n Runtime', () => {
  it('supports 19 languages', () => {
    const langs = getSupportedLanguages();
    expect(langs).toHaveLength(19);
    expect(langs).toContain('en');
    expect(langs).toContain('hi');
    expect(langs).toContain('or');
    expect(langs).toContain('bn');
    expect(langs).toContain('ta');
    expect(langs).toContain('te');
    expect(langs).toContain('ar');
    expect(langs).toContain('zh');
    expect(langs).toContain('ja');
    expect(langs).toContain('ko');
  });

  it('detects RTL over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      expect(isRtlLanguage('ar')).toBe(true);
      expect(isRtlLanguage('ur')).toBe(true);
      expect(isRtlLanguage('en')).toBe(false);
      expect(isRtlLanguage('hi')).toBe(false);
    }
  });

  it('language switching over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let config = createI18nConfig('en');
      expect(config.currentLanguage).toBe('en');
      expect(config.direction).toBe('ltr');
      config = switchLanguage(config, 'ar');
      expect(config.currentLanguage).toBe('ar');
      expect(config.direction).toBe('rtl');
      config = switchLanguage(config, 'hi');
      expect(config.direction).toBe('ltr');
    }
  });

  it('locale detection over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      expect(detectLocale('en-US')).toBe('en');
      expect(detectLocale('hi-IN')).toBe('hi');
      expect(detectLocale('ar-SA')).toBe('ar');
      expect(detectLocale('unknown')).toBe('en');
    }
  });

  it('translation + fallback over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const bundles = [
        createTranslationBundle('en', 'common', { greeting: 'Hello', save: 'Save' }),
        createTranslationBundle('hi', 'common', { greeting: 'नमस्ते' }),
      ];
      expect(translate(bundles, 'greeting', 'hi')).toBe('नमस्ते');
      expect(translate(bundles, 'save', 'hi')).toBe('Save'); // fallback
      expect(translate(bundles, 'unknown', 'hi')).toBe('unknown');
    }
  });

  it('parameterized translations over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const bundles = [createTranslationBundle('en', 'common', { welcome: 'Welcome, {{name}}!' })];
      expect(translateWithParams(bundles, 'welcome', { name: 'Alice' }, 'en')).toBe('Welcome, Alice!');
    }
  });

  it('pluralization over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const bundles = [createTranslationBundle('en', 'common', { items_one: '{{count}} item', items_other: '{{count}} items' })];
      expect(pluralize(bundles, 'items', 1, 'en')).toBe('1 item');
      expect(pluralize(bundles, 'items', 5, 'en')).toBe('5 items');
    }
  });

  it('number/currency/date formatting over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      expect(formatNumber(1234567.89, 'en')).toBe('1,234,567.89');
      expect(formatNumber(1234567.89, 'de')).toBe('1.234.567,89');
      expect(formatCurrency(99.99, 'en')).toContain('$');
      expect(formatCurrency(99.99, 'hi')).toContain('₹');
      const d = new Date(2025, 0, 15).getTime();
      expect(formatDate(d, 'en')).toBe('01/15/2025');
      expect(formatDate(d, 'de')).toBe('15.01.2025');
    }
  });

  it('I18nSynchronizer lifecycle', () => {
    const sync = new I18nSynchronizer();
    sync.addBundle(createTranslationBundle('en', 'common', { hello: 'Hello' }));
    sync.addBundle(createTranslationBundle('hi', 'common', { hello: 'नमस्ते' }));
    sync.setConfig(switchLanguage(createI18nConfig(), 'hi'));
    expect(sync.translate('hello')).toBe('नमस्ते');
    const clone = sync.clone();
    expect(clone.translate('hello')).toBe('नमस्ते');
    sync.clear();
    expect(sync.getAllBundles()).toHaveLength(0);
  });
});
