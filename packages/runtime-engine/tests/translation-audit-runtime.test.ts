/**
 * Phase 38B — Translation Audit Runtime Tests
 */
import { describe, it, expect } from 'vitest';
import {
  auditTranslationCoverage, scoreBundleQuality, detectFallbackUsage,
  TranslationAuditSynchronizer,
} from '../src/stage/translation-audit-runtime';
import { createTranslationBundle } from '../src/stage/i18n-runtime';

describe('Phase 38B: Translation Audit', () => {
  it('audits coverage over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const sources = [createTranslationBundle('en', 'common', { hello: 'Hello', save: 'Save', cancel: 'Cancel' })];
      const all = [...sources, createTranslationBundle('hi', 'common', { hello: 'नमस्ते' })];
      const report = auditTranslationCoverage(sources, all, ['hi']);
      expect(report.overallCoverage).toBe(33);
      expect(report.totalMissing).toBe(2);
      expect(report.issues.filter(i => i.type === 'missing')).toHaveLength(2);
    }
  });

  it('scores bundle quality over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const source = createTranslationBundle('en', 'common', { msg: 'Hello {{name}}.', bye: 'Bye.' });
      const good = createTranslationBundle('hi', 'common', { msg: 'नमस्ते {{name}}.', bye: 'अलविदा.' });
      const score = scoreBundleQuality(source, good);
      expect(score.completeness).toBe(100);
      expect(score.consistency).toBe(100);
      expect(score.formatting).toBe(100);
      expect(score.overall).toBe(100);
    }
  });

  it('detects parameter mismatches in quality scoring over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const source = createTranslationBundle('en', 'common', { msg: 'Hello {{name}} {{count}}' });
      const bad = createTranslationBundle('hi', 'common', { msg: 'नमस्ते {{name}}' });
      const score = scoreBundleQuality(source, bad);
      expect(score.consistency).toBeLessThan(100);
    }
  });

  it('detects formatting issues over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const source = createTranslationBundle('en', 'common', { msg: 'Hello.' });
      const bad = createTranslationBundle('hi', 'common', { msg: 'नमस्ते' }); // missing period
      const score = scoreBundleQuality(source, bad);
      expect(score.formatting).toBeLessThan(100);
    }
  });

  it('detects fallback usage over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const sources = [createTranslationBundle('en', 'common', { a: 'A', b: 'B', c: 'C' })];
      const targets = [createTranslationBundle('hi', 'common', { a: 'अ' })];
      const fallbacks = detectFallbackUsage(sources, targets, 'hi');
      expect(fallbacks).toHaveLength(2);
    }
  });

  it('TranslationAuditSynchronizer lifecycle', () => {
    const sync = new TranslationAuditSynchronizer();
    const sources = [createTranslationBundle('en', 'common', { hello: 'Hello' })];
    const all = [...sources, createTranslationBundle('hi', 'common', { hello: 'नमस्ते' })];
    const report = auditTranslationCoverage(sources, all, ['hi']);
    sync.addReport(report);
    expect(sync.getLatestReport()?.overallCoverage).toBe(100);
    const clone = sync.clone();
    expect(clone.getLatestReport()?.overallCoverage).toBe(100);
    sync.clear();
    expect(sync.getReports()).toHaveLength(0);
  });
});
