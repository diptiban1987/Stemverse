/**
 * Phase 38B — Localization Runtime
 *
 * Translation management, missing translation detection,
 * coverage reporting, bundle validation, import/export.
 */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

import type { LanguageCode, TranslationBundle } from './i18n-runtime';

// ─── Types ───────────────────────────────────────────────────

export interface TranslationCoverage {
  language: LanguageCode;
  namespace: string;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: string[];
  coveragePercent: number;
}

export interface BundleValidation {
  bundleId: string;
  language: LanguageCode;
  namespace: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface LocalizationProject {
  projectId: string;
  name: string;
  sourceLanguage: LanguageCode;
  targetLanguages: LanguageCode[];
  namespaces: string[];
  createdAt: number;
  updatedAt: number;
}

export interface TranslationExport {
  format: 'json' | 'csv' | 'xliff';
  language: LanguageCode;
  namespace: string;
  content: string;
  exportedAt: number;
}

// ─── Coverage ────────────────────────────────────────────────

export function calculateCoverage(sourceBundle: TranslationBundle, targetBundle: TranslationBundle | undefined): TranslationCoverage {
  const totalKeys = Object.keys(sourceBundle.keys).length;
  if (!targetBundle) {
    return { language: sourceBundle.language, namespace: sourceBundle.namespace, totalKeys, translatedKeys: 0, missingKeys: Object.keys(sourceBundle.keys), coveragePercent: 0 };
  }
  const missingKeys = Object.keys(sourceBundle.keys).filter(k => !targetBundle.keys[k]);
  const translatedKeys = totalKeys - missingKeys.length;
  return { language: targetBundle.language, namespace: targetBundle.namespace, totalKeys, translatedKeys, missingKeys, coveragePercent: totalKeys > 0 ? Math.round((translatedKeys / totalKeys) * 100) : 0 };
}

export function getOverallCoverage(coverages: TranslationCoverage[]): number {
  if (coverages.length === 0) return 0;
  const total = coverages.reduce((s, c) => s + c.coveragePercent, 0);
  return Math.round(total / coverages.length);
}

// ─── Missing Detection ───────────────────────────────────────

export function detectMissingTranslations(sourceBundles: TranslationBundle[], targetBundles: TranslationBundle[], targetLang: LanguageCode): TranslationCoverage[] {
  return sourceBundles.map(src => {
    const target = targetBundles.find(t => t.language === targetLang && t.namespace === src.namespace);
    return calculateCoverage(src, target);
  });
}

export function getAllMissingKeys(coverages: TranslationCoverage[]): { language: LanguageCode; namespace: string; key: string }[] {
  const missing: { language: LanguageCode; namespace: string; key: string }[] = [];
  coverages.forEach(c => c.missingKeys.forEach(key => missing.push({ language: c.language, namespace: c.namespace, key })));
  return missing;
}

// ─── Bundle Validation ───────────────────────────────────────

export function validateBundle(bundle: TranslationBundle): BundleValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!bundle.language) errors.push('Missing language code');
  if (!bundle.namespace) errors.push('Missing namespace');
  if (Object.keys(bundle.keys).length === 0) warnings.push('Empty translation bundle');
  Object.entries(bundle.keys).forEach(([k, v]) => {
    if (!v.trim()) warnings.push(`Empty value for key: ${k}`);
    if (v.includes('{{') && !v.includes('}}')) errors.push(`Unclosed parameter in key: ${k}`);
  });
  return { bundleId: bundle.bundleId, language: bundle.language, namespace: bundle.namespace, valid: errors.length === 0, errors, warnings };
}

export function validateConsistency(sourceBundle: TranslationBundle, targetBundle: TranslationBundle): string[] {
  const issues: string[] = [];
  Object.entries(sourceBundle.keys).forEach(([k, v]) => {
    const targetVal = targetBundle.keys[k];
    if (!targetVal) return;
    const sourceParams = (v.match(/\{\{(\w+)\}\}/g) || []).sort();
    const targetParams = (targetVal.match(/\{\{(\w+)\}\}/g) || []).sort();
    if (JSON.stringify(sourceParams) !== JSON.stringify(targetParams)) {
      issues.push(`Parameter mismatch in key '${k}': source has ${sourceParams.join(',')} but target has ${targetParams.join(',')}`);
    }
  });
  return issues;
}

// ─── Import/Export ───────────────────────────────────────────

export function exportBundleAsJSON(bundle: TranslationBundle): TranslationExport {
  return { format: 'json', language: bundle.language, namespace: bundle.namespace, content: JSON.stringify(bundle.keys, null, 2), exportedAt: now() };
}

export function exportBundleAsCSV(bundle: TranslationBundle): TranslationExport {
  const lines = ['key,value', ...Object.entries(bundle.keys).map(([k, v]) => `"${k}","${v.replace(/"/g, '""')}"`)];
  return { format: 'csv', language: bundle.language, namespace: bundle.namespace, content: lines.join('\n'), exportedAt: now() };
}

export function importFromJSON(jsonStr: string, language: LanguageCode, namespace: string): TranslationBundle {
  const keys = JSON.parse(jsonStr) as Record<string, string>;
  return { bundleId: uid(), language, namespace, keys, version: '1.0', updatedAt: now() };
}

// ─── Localization Project ────────────────────────────────────

export function createLocalizationProject(name: string, sourceLanguage: LanguageCode, targetLanguages: LanguageCode[], namespaces: string[]): LocalizationProject {
  return { projectId: uid(), name, sourceLanguage, targetLanguages, namespaces, createdAt: now(), updatedAt: now() };
}

// ─── Synchronizer ────────────────────────────────────────────

export class LocalizationSynchronizer {
  private coverages: TranslationCoverage[] = [];
  private validations: BundleValidation[] = [];
  private projects = new Map<string, LocalizationProject>();

  addCoverage(c: TranslationCoverage) { this.coverages.push({ ...c }); }
  getCoverages() { return this.coverages.map(c => ({ ...c })); }
  getOverallCoverage() { return getOverallCoverage(this.coverages); }

  addValidation(v: BundleValidation) { this.validations.push({ ...v }); }
  getValidations() { return this.validations.map(v => ({ ...v })); }

  addProject(p: LocalizationProject) { this.projects.set(p.projectId, { ...p }); }
  getAllProjects() { return Array.from(this.projects.values()).map(p => ({ ...p })); }

  clear() { this.coverages = []; this.validations = []; this.projects.clear(); }

  toJSON() { return { coverages: this.getCoverages(), validations: this.getValidations(), projects: this.getAllProjects() }; }
  fromJSON(d: { coverages?: TranslationCoverage[]; validations?: BundleValidation[]; projects?: LocalizationProject[] }) {
    this.clear();
    (d.coverages || []).forEach(c => this.addCoverage(c));
    (d.validations || []).forEach(v => this.addValidation(v));
    (d.projects || []).forEach(p => this.addProject(p));
  }
  clone(): LocalizationSynchronizer { const c = new LocalizationSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
