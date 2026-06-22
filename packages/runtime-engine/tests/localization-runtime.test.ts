/**
 * Phase 38B — Localization Runtime Tests
 */
import { describe, it, expect } from 'vitest';
import {
  calculateCoverage, getOverallCoverage, detectMissingTranslations,
  getAllMissingKeys, validateBundle, validateConsistency,
  exportBundleAsJSON, exportBundleAsCSV, importFromJSON,
  createLocalizationProject, LocalizationSynchronizer,
} from '../src/stage/localization-runtime';
import { createTranslationBundle } from '../src/stage/i18n-runtime';

describe('Phase 38B: Localization Runtime', () => {
  it('calculates coverage over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const source = createTranslationBundle('en', 'common', { hello: 'Hello', save: 'Save', cancel: 'Cancel' });
      const target = createTranslationBundle('hi', 'common', { hello: 'नमस्ते', save: 'सेव करें' });
      const cov = calculateCoverage(source, target);
      expect(cov.totalKeys).toBe(3);
      expect(cov.translatedKeys).toBe(2);
      expect(cov.missingKeys).toEqual(['cancel']);
      expect(cov.coveragePercent).toBe(67);
    }
  });

  it('overall coverage over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const coverages = [
        { language: 'hi' as const, namespace: 'common', totalKeys: 10, translatedKeys: 8, missingKeys: ['a', 'b'], coveragePercent: 80 },
        { language: 'hi' as const, namespace: 'sim', totalKeys: 10, translatedKeys: 6, missingKeys: ['c', 'd', 'e', 'f'], coveragePercent: 60 },
      ];
      expect(getOverallCoverage(coverages)).toBe(70);
    }
  });

  it('detects missing translations over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const sources = [createTranslationBundle('en', 'common', { a: 'A', b: 'B', c: 'C' })];
      const targets = [createTranslationBundle('hi', 'common', { a: 'अ' })];
      const coverages = detectMissingTranslations(sources, targets, 'hi');
      expect(coverages[0].missingKeys).toHaveLength(2);
      const allMissing = getAllMissingKeys(coverages);
      expect(allMissing).toHaveLength(2);
    }
  });

  it('validates bundles over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const good = createTranslationBundle('en', 'common', { hello: 'Hello {{name}}' });
      const result = validateBundle(good);
      expect(result.valid).toBe(true);
      const bad = createTranslationBundle('en', 'common', { broken: 'Hello {{name' });
      const badResult = validateBundle(bad);
      expect(badResult.valid).toBe(false);
    }
  });

  it('validates consistency over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const source = createTranslationBundle('en', 'common', { msg: 'Hello {{name}}, {{count}} items' });
      const good = createTranslationBundle('hi', 'common', { msg: 'नमस्ते {{name}}, {{count}} आइटम' });
      expect(validateConsistency(source, good)).toHaveLength(0);
      const bad = createTranslationBundle('hi', 'common', { msg: 'नमस्ते {{name}}' });
      expect(validateConsistency(source, bad).length).toBeGreaterThan(0);
    }
  });

  it('exports and imports bundles over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const bundle = createTranslationBundle('en', 'common', { hello: 'Hello', bye: 'Bye' });
      const jsonExport = exportBundleAsJSON(bundle);
      expect(jsonExport.format).toBe('json');
      expect(jsonExport.content).toContain('hello');
      const csvExport = exportBundleAsCSV(bundle);
      expect(csvExport.format).toBe('csv');
      expect(csvExport.content).toContain('key,value');
      const imported = importFromJSON('{"greet":"Hi"}', 'en', 'test');
      expect(imported.keys.greet).toBe('Hi');
    }
  });

  it('LocalizationSynchronizer lifecycle', () => {
    const sync = new LocalizationSynchronizer();
    sync.addProject(createLocalizationProject('STEMVerse', 'en', ['hi', 'ta', 'te'], ['common', 'sim']));
    for (let i = 0; i < 50; i++) {
      sync.addCoverage({ language: 'hi', namespace: 'common', totalKeys: 100, translatedKeys: 80, missingKeys: [], coveragePercent: 80 });
    }
    expect(sync.getAllProjects()).toHaveLength(1);
    expect(sync.getOverallCoverage()).toBe(80);
    const clone = sync.clone();
    expect(clone.getOverallCoverage()).toBe(80);
    sync.clear();
    expect(sync.getCoverages()).toHaveLength(0);
  });
});
