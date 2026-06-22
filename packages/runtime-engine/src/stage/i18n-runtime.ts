/**
 * Phase 38B — Internationalization Runtime
 *
 * Language registry, translation bundles, namespace loading,
 * fallback chains, pluralization, locale detection, RTL,
 * currency/date/number formatting, language switching.
 */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Types ───────────────────────────────────────────────────

export type LanguageCode = 'en' | 'hi' | 'or' | 'bn' | 'ta' | 'te' | 'kn' | 'ml' | 'mr' | 'gu' | 'pa' | 'ur' | 'es' | 'fr' | 'de' | 'ar' | 'zh' | 'ja' | 'ko';
export type TextDirection = 'ltr' | 'rtl';

export interface LanguageEntry {
  code: LanguageCode;
  name: string;
  nativeName: string;
  direction: TextDirection;
  pluralRules: 'one_other' | 'one_two_few_other' | 'zero_one_other' | 'other_only';
  dateFormat: string;
  numberSeparator: string;
  decimalSeparator: string;
  currencySymbol: string;
  currencyCode: string;
}

export interface TranslationBundle {
  bundleId: string;
  language: LanguageCode;
  namespace: string;
  keys: Record<string, string>;
  version: string;
  updatedAt: number;
}

export interface I18nConfig {
  defaultLanguage: LanguageCode;
  fallbackLanguage: LanguageCode;
  supportedLanguages: LanguageCode[];
  loadedNamespaces: string[];
  currentLanguage: LanguageCode;
  direction: TextDirection;
}

// ─── Language Registry ───────────────────────────────────────

export const LANGUAGE_REGISTRY: Record<LanguageCode, LanguageEntry> = {
  en: { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', pluralRules: 'one_other', dateFormat: 'MM/DD/YYYY', numberSeparator: ',', decimalSeparator: '.', currencySymbol: '$', currencyCode: 'USD' },
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr', pluralRules: 'one_other', dateFormat: 'DD/MM/YYYY', numberSeparator: ',', decimalSeparator: '.', currencySymbol: '₹', currencyCode: 'INR' },
  or: { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', direction: 'ltr', pluralRules: 'one_other', dateFormat: 'DD/MM/YYYY', numberSeparator: ',', decimalSeparator: '.', currencySymbol: '₹', currencyCode: 'INR' },
  bn: { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', direction: 'ltr', pluralRules: 'one_other', dateFormat: 'DD/MM/YYYY', numberSeparator: ',', decimalSeparator: '.', currencySymbol: '₹', currencyCode: 'INR' },
  ta: { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', direction: 'ltr', pluralRules: 'one_other', dateFormat: 'DD/MM/YYYY', numberSeparator: ',', decimalSeparator: '.', currencySymbol: '₹', currencyCode: 'INR' },
  te: { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', direction: 'ltr', pluralRules: 'one_other', dateFormat: 'DD/MM/YYYY', numberSeparator: ',', decimalSeparator: '.', currencySymbol: '₹', currencyCode: 'INR' },
  kn: { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', direction: 'ltr', pluralRules: 'one_other', dateFormat: 'DD/MM/YYYY', numberSeparator: ',', decimalSeparator: '.', currencySymbol: '₹', currencyCode: 'INR' },
  ml: { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', direction: 'ltr', pluralRules: 'one_other', dateFormat: 'DD/MM/YYYY', numberSeparator: ',', decimalSeparator: '.', currencySymbol: '₹', currencyCode: 'INR' },
  mr: { code: 'mr', name: 'Marathi', nativeName: 'मराठी', direction: 'ltr', pluralRules: 'one_other', dateFormat: 'DD/MM/YYYY', numberSeparator: ',', decimalSeparator: '.', currencySymbol: '₹', currencyCode: 'INR' },
  gu: { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', direction: 'ltr', pluralRules: 'one_other', dateFormat: 'DD/MM/YYYY', numberSeparator: ',', decimalSeparator: '.', currencySymbol: '₹', currencyCode: 'INR' },
  pa: { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', direction: 'ltr', pluralRules: 'one_other', dateFormat: 'DD/MM/YYYY', numberSeparator: ',', decimalSeparator: '.', currencySymbol: '₹', currencyCode: 'INR' },
  ur: { code: 'ur', name: 'Urdu', nativeName: 'اردو', direction: 'rtl', pluralRules: 'one_other', dateFormat: 'DD/MM/YYYY', numberSeparator: ',', decimalSeparator: '.', currencySymbol: '₹', currencyCode: 'INR' },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr', pluralRules: 'one_other', dateFormat: 'DD/MM/YYYY', numberSeparator: '.', decimalSeparator: ',', currencySymbol: '€', currencyCode: 'EUR' },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr', pluralRules: 'one_other', dateFormat: 'DD/MM/YYYY', numberSeparator: ' ', decimalSeparator: ',', currencySymbol: '€', currencyCode: 'EUR' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr', pluralRules: 'one_other', dateFormat: 'DD.MM.YYYY', numberSeparator: '.', decimalSeparator: ',', currencySymbol: '€', currencyCode: 'EUR' },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', pluralRules: 'one_two_few_other', dateFormat: 'DD/MM/YYYY', numberSeparator: ',', decimalSeparator: '.', currencySymbol: 'ر.س', currencyCode: 'SAR' },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'ltr', pluralRules: 'other_only', dateFormat: 'YYYY/MM/DD', numberSeparator: ',', decimalSeparator: '.', currencySymbol: '¥', currencyCode: 'CNY' },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr', pluralRules: 'other_only', dateFormat: 'YYYY/MM/DD', numberSeparator: ',', decimalSeparator: '.', currencySymbol: '¥', currencyCode: 'JPY' },
  ko: { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr', pluralRules: 'other_only', dateFormat: 'YYYY.MM.DD', numberSeparator: ',', decimalSeparator: '.', currencySymbol: '₩', currencyCode: 'KRW' },
};

export function getSupportedLanguages(): LanguageCode[] {
  return Object.keys(LANGUAGE_REGISTRY) as LanguageCode[];
}

export function getLanguageEntry(code: LanguageCode): LanguageEntry {
  return { ...LANGUAGE_REGISTRY[code] };
}

export function isRtlLanguage(code: LanguageCode): boolean {
  return LANGUAGE_REGISTRY[code]?.direction === 'rtl';
}

// ─── I18n Config ─────────────────────────────────────────────

export function createI18nConfig(defaultLang: LanguageCode = 'en'): I18nConfig {
  return {
    defaultLanguage: defaultLang, fallbackLanguage: 'en',
    supportedLanguages: getSupportedLanguages(),
    loadedNamespaces: ['common'], currentLanguage: defaultLang,
    direction: LANGUAGE_REGISTRY[defaultLang].direction,
  };
}

export function switchLanguage(config: I18nConfig, lang: LanguageCode): I18nConfig {
  if (!config.supportedLanguages.includes(lang)) return config;
  return { ...config, currentLanguage: lang, direction: LANGUAGE_REGISTRY[lang].direction };
}

export function detectLocale(browserLocale: string): LanguageCode {
  const code = browserLocale.split('-')[0].toLowerCase() as LanguageCode;
  return LANGUAGE_REGISTRY[code] ? code : 'en';
}

// ─── Translation Bundles ─────────────────────────────────────

export function createTranslationBundle(language: LanguageCode, namespace: string, keys: Record<string, string>, version = '1.0'): TranslationBundle {
  return { bundleId: uid(), language, namespace, keys, version, updatedAt: now() };
}

export function translate(bundles: TranslationBundle[], key: string, language: LanguageCode, namespace = 'common', fallback: LanguageCode = 'en'): string {
  const bundle = bundles.find(b => b.language === language && b.namespace === namespace);
  if (bundle?.keys[key]) return bundle.keys[key];
  const fallbackBundle = bundles.find(b => b.language === fallback && b.namespace === namespace);
  return fallbackBundle?.keys[key] || key;
}

export function translateWithParams(bundles: TranslationBundle[], key: string, params: Record<string, string | number>, language: LanguageCode, namespace = 'common'): string {
  let result = translate(bundles, key, language, namespace);
  Object.entries(params).forEach(([k, v]) => { result = result.replace(`{{${k}}}`, String(v)); });
  return result;
}

// ─── Pluralization ───────────────────────────────────────────

export function pluralize(bundles: TranslationBundle[], key: string, count: number, language: LanguageCode, namespace = 'common'): string {
  const suffix = count === 1 ? '_one' : '_other';
  const pluralKey = `${key}${suffix}`;
  const result = translate(bundles, pluralKey, language, namespace);
  return result !== pluralKey ? result.replace('{{count}}', String(count)) : translate(bundles, key, language, namespace).replace('{{count}}', String(count));
}

// ─── Formatting ──────────────────────────────────────────────

export function formatNumber(value: number, language: LanguageCode): string {
  const entry = LANGUAGE_REGISTRY[language];
  const parts = value.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, entry.numberSeparator);
  return parts.length > 1 ? `${intPart}${entry.decimalSeparator}${parts[1]}` : intPart;
}

export function formatCurrency(value: number, language: LanguageCode): string {
  const entry = LANGUAGE_REGISTRY[language];
  return `${entry.currencySymbol}${formatNumber(value, language)}`;
}

export function formatDate(timestamp: number, language: LanguageCode): string {
  const d = new Date(timestamp);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  const fmt = LANGUAGE_REGISTRY[language].dateFormat;
  return fmt.replace('DD', dd).replace('MM', mm).replace('YYYY', yyyy);
}

// ─── Synchronizer ────────────────────────────────────────────

export class I18nSynchronizer {
  private config: I18nConfig = createI18nConfig();
  private bundles = new Map<string, TranslationBundle>();

  setConfig(c: I18nConfig) { this.config = { ...c }; }
  getConfig() { return { ...this.config }; }

  addBundle(b: TranslationBundle) { this.bundles.set(`${b.language}:${b.namespace}`, { ...b }); }
  getBundle(lang: LanguageCode, ns: string) { const b = this.bundles.get(`${lang}:${ns}`); return b ? { ...b } : undefined; }
  getAllBundles() { return Array.from(this.bundles.values()).map(b => ({ ...b })); }

  translate(key: string, ns = 'common') { return translate(this.getAllBundles(), key, this.config.currentLanguage, ns, this.config.fallbackLanguage); }

  clear() { this.config = createI18nConfig(); this.bundles.clear(); }

  toJSON() { return { config: this.getConfig(), bundles: this.getAllBundles() }; }
  fromJSON(d: { config?: I18nConfig; bundles?: TranslationBundle[] }) {
    this.clear();
    if (d.config) this.setConfig(d.config);
    (d.bundles || []).forEach(b => this.addBundle(b));
  }
  clone(): I18nSynchronizer { const c = new I18nSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
