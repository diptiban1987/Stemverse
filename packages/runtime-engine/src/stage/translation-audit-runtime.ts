/**
 * Phase 38B — Translation Audit Runtime
 *
 * Coverage %, missing strings, fallback usage,
 * bundle quality, consistency validation.
 */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

import type { LanguageCode, TranslationBundle } from './i18n-runtime';
import type { TranslationCoverage } from './localization-runtime';

// ─── Types ───────────────────────────────────────────────────

export interface TranslationAuditReport {
  reportId: string;
  generatedAt: number;
  overallCoverage: number;
  languageCoverages: Record<string, number>;
  totalKeys: number;
  totalTranslated: number;
  totalMissing: number;
  qualityScore: number;
  issues: TranslationAuditIssue[];
}

export interface TranslationAuditIssue {
  issueId: string;
  language: LanguageCode;
  namespace: string;
  type: 'missing' | 'empty' | 'untranslated' | 'parameter_mismatch' | 'too_long' | 'inconsistent';
  key: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface BundleQualityScore {
  language: LanguageCode;
  namespace: string;
  completeness: number;
  consistency: number;
  formatting: number;
  overall: number;
}

// ─── Audit ───────────────────────────────────────────────────

export function auditTranslationCoverage(sourceBundles: TranslationBundle[], allBundles: TranslationBundle[], languages: LanguageCode[]): TranslationAuditReport {
  const issues: TranslationAuditIssue[] = [];
  const langCoverages: Record<string, number> = {};
  let totalKeys = 0;
  let totalTranslated = 0;
  let totalMissing = 0;

  languages.forEach(lang => {
    let langTotal = 0;
    let langTranslated = 0;
    sourceBundles.forEach(src => {
      const target = allBundles.find(b => b.language === lang && b.namespace === src.namespace);
      const srcKeys = Object.keys(src.keys);
      langTotal += srcKeys.length;
      srcKeys.forEach(key => {
        if (target?.keys[key]) {
          langTranslated++;
          if (!target.keys[key].trim()) {
            issues.push({ issueId: uid(), language: lang, namespace: src.namespace, type: 'empty', key, message: `Empty translation for '${key}'`, severity: 'warning' });
          }
        } else {
          issues.push({ issueId: uid(), language: lang, namespace: src.namespace, type: 'missing', key, message: `Missing translation for '${key}'`, severity: 'error' });
        }
      });
    });
    totalKeys += langTotal;
    totalTranslated += langTranslated;
    totalMissing += (langTotal - langTranslated);
    langCoverages[lang] = langTotal > 0 ? Math.round((langTranslated / langTotal) * 100) : 0;
  });

  const overallCoverage = totalKeys > 0 ? Math.round((totalTranslated / totalKeys) * 100) : 0;
  const qualityScore = Math.max(0, overallCoverage - issues.filter(i => i.severity === 'error').length);

  return { reportId: uid(), generatedAt: now(), overallCoverage, languageCoverages: langCoverages, totalKeys, totalTranslated, totalMissing, qualityScore, issues };
}

// ─── Quality Scoring ─────────────────────────────────────────

export function scoreBundleQuality(source: TranslationBundle, target: TranslationBundle): BundleQualityScore {
  const srcKeys = Object.keys(source.keys);
  const translatedCount = srcKeys.filter(k => target.keys[k]).length;
  const completeness = srcKeys.length > 0 ? Math.round((translatedCount / srcKeys.length) * 100) : 0;

  let paramIssues = 0;
  srcKeys.forEach(k => {
    if (!target.keys[k]) return;
    const srcParams = (source.keys[k].match(/\{\{(\w+)\}\}/g) || []).sort();
    const tgtParams = (target.keys[k].match(/\{\{(\w+)\}\}/g) || []).sort();
    if (JSON.stringify(srcParams) !== JSON.stringify(tgtParams)) paramIssues++;
  });
  const consistency = translatedCount > 0 ? Math.round(((translatedCount - paramIssues) / translatedCount) * 100) : 0;

  let formatIssues = 0;
  srcKeys.forEach(k => {
    if (!target.keys[k]) return;
    if (source.keys[k].endsWith('.') && !target.keys[k].endsWith('.')) formatIssues++;
  });
  const formatting = translatedCount > 0 ? Math.round(((translatedCount - formatIssues) / translatedCount) * 100) : 0;

  const overall = Math.round((completeness + consistency + formatting) / 3);
  return { language: target.language, namespace: target.namespace, completeness, consistency, formatting, overall };
}

// ─── Fallback Detection ──────────────────────────────────────

export function detectFallbackUsage(sourceBundles: TranslationBundle[], targetBundles: TranslationBundle[], targetLang: LanguageCode): { key: string; namespace: string }[] {
  const fallbacks: { key: string; namespace: string }[] = [];
  sourceBundles.forEach(src => {
    const target = targetBundles.find(b => b.language === targetLang && b.namespace === src.namespace);
    Object.keys(src.keys).forEach(key => {
      if (!target?.keys[key]) fallbacks.push({ key, namespace: src.namespace });
    });
  });
  return fallbacks;
}

// ─── Synchronizer ────────────────────────────────────────────

export class TranslationAuditSynchronizer {
  private reports: TranslationAuditReport[] = [];
  private qualityScores: BundleQualityScore[] = [];

  addReport(r: TranslationAuditReport) { this.reports.push({ ...r }); }
  getReports() { return this.reports.map(r => ({ ...r })); }
  getLatestReport() { return this.reports.length > 0 ? { ...this.reports[this.reports.length - 1] } : undefined; }

  addQualityScore(q: BundleQualityScore) { this.qualityScores.push({ ...q }); }
  getQualityScores() { return this.qualityScores.map(q => ({ ...q })); }

  clear() { this.reports = []; this.qualityScores = []; }

  toJSON() { return { reports: this.getReports(), qualityScores: this.getQualityScores() }; }
  fromJSON(d: { reports?: TranslationAuditReport[]; qualityScores?: BundleQualityScore[] }) {
    this.clear();
    (d.reports || []).forEach(r => this.addReport(r));
    (d.qualityScores || []).forEach(q => this.addQualityScore(q));
  }
  clone(): TranslationAuditSynchronizer { const c = new TranslationAuditSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
