/**
 * Phase 39A — White Label Runtime
 *
 * Custom branding: logo, colors, domain, email, certificates,
 * reports, login pages. Tenant-level customization.
 */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Types ───────────────────────────────────────────────────

export type BrandingScope = 'school' | 'district' | 'enterprise' | 'competition' | 'marketplace';

export interface WhiteLabelConfig {
  configId: string;
  tenantId: string;
  tenantName: string;
  scope: BrandingScope;
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  customDomain: string | null;
  customEmailFrom: string | null;
  customEmailTemplate: string | null;
  customCertificateTemplate: string | null;
  customLoginPage: string | null;
  customReportHeader: string | null;
  footerText: string;
  copyrightText: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface BrandingTheme {
  themeId: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  borderRadius: number;
  preset: boolean;
}

// ─── White Label Operations ──────────────────────────────────

export function createWhiteLabelConfig(tenantId: string, tenantName: string, scope: BrandingScope): WhiteLabelConfig {
  return {
    configId: uid(), tenantId, tenantName, scope,
    logo: '/default-logo.svg', favicon: '/favicon.ico',
    primaryColor: '#2563EB', secondaryColor: '#7C3AED', accentColor: '#06B6D4',
    backgroundColor: '#0F172A', textColor: '#F8FAFC', fontFamily: 'Inter, sans-serif',
    customDomain: null, customEmailFrom: null, customEmailTemplate: null,
    customCertificateTemplate: null, customLoginPage: null, customReportHeader: null,
    footerText: 'Powered by STEMVerse', copyrightText: `© ${new Date().getFullYear()} STEMVerse`,
    enabled: false, createdAt: now(), updatedAt: now(),
  };
}

export function enableWhiteLabel(config: WhiteLabelConfig): WhiteLabelConfig {
  return { ...config, enabled: true, updatedAt: now() };
}

export function disableWhiteLabel(config: WhiteLabelConfig): WhiteLabelConfig {
  return { ...config, enabled: false, updatedAt: now() };
}

export function updateBranding(config: WhiteLabelConfig, updates: Partial<WhiteLabelConfig>): WhiteLabelConfig {
  return { ...config, ...updates, configId: config.configId, tenantId: config.tenantId, updatedAt: now() };
}

export function setCustomDomain(config: WhiteLabelConfig, domain: string): WhiteLabelConfig {
  return { ...config, customDomain: domain, updatedAt: now() };
}

export function setCustomLogo(config: WhiteLabelConfig, logoUrl: string): WhiteLabelConfig {
  return { ...config, logo: logoUrl, updatedAt: now() };
}

export function setCustomColors(config: WhiteLabelConfig, primary: string, secondary: string, accent: string): WhiteLabelConfig {
  return { ...config, primaryColor: primary, secondaryColor: secondary, accentColor: accent, updatedAt: now() };
}

export function setCustomEmail(config: WhiteLabelConfig, from: string, template: string): WhiteLabelConfig {
  return { ...config, customEmailFrom: from, customEmailTemplate: template, updatedAt: now() };
}

export function setCustomCertificate(config: WhiteLabelConfig, template: string): WhiteLabelConfig {
  return { ...config, customCertificateTemplate: template, updatedAt: now() };
}

// ─── Preset Themes ───────────────────────────────────────────

export function createBrandingTheme(name: string, primaryColor: string, secondaryColor: string, accentColor: string): BrandingTheme {
  return { themeId: uid(), name, primaryColor, secondaryColor, accentColor, backgroundColor: '#0F172A', textColor: '#F8FAFC', fontFamily: 'Inter, sans-serif', borderRadius: 8, preset: false };
}

export function getPresetThemes(): BrandingTheme[] {
  return [
    { themeId: 'p1', name: 'Ocean', primaryColor: '#0EA5E9', secondaryColor: '#06B6D4', accentColor: '#14B8A6', backgroundColor: '#0C1222', textColor: '#F0F9FF', fontFamily: 'Inter', borderRadius: 8, preset: true },
    { themeId: 'p2', name: 'Forest', primaryColor: '#22C55E', secondaryColor: '#10B981', accentColor: '#84CC16', backgroundColor: '#0D1117', textColor: '#F0FDF4', fontFamily: 'Inter', borderRadius: 8, preset: true },
    { themeId: 'p3', name: 'Sunset', primaryColor: '#F97316', secondaryColor: '#EF4444', accentColor: '#F59E0B', backgroundColor: '#1C1008', textColor: '#FFF7ED', fontFamily: 'Inter', borderRadius: 8, preset: true },
    { themeId: 'p4', name: 'Royal', primaryColor: '#7C3AED', secondaryColor: '#8B5CF6', accentColor: '#A855F7', backgroundColor: '#0F0720', textColor: '#F5F3FF', fontFamily: 'Inter', borderRadius: 8, preset: true },
    { themeId: 'p5', name: 'Government', primaryColor: '#1D4ED8', secondaryColor: '#2563EB', accentColor: '#3B82F6', backgroundColor: '#FFFFFF', textColor: '#1E293B', fontFamily: 'Roboto', borderRadius: 4, preset: true },
  ];
}

export function applyTheme(config: WhiteLabelConfig, theme: BrandingTheme): WhiteLabelConfig {
  return { ...config, primaryColor: theme.primaryColor, secondaryColor: theme.secondaryColor, accentColor: theme.accentColor, backgroundColor: theme.backgroundColor, textColor: theme.textColor, fontFamily: theme.fontFamily, updatedAt: now() };
}

// ─── Synchronizer ────────────────────────────────────────────

export class WhiteLabelSynchronizer {
  private configs = new Map<string, WhiteLabelConfig>();
  private themes = new Map<string, BrandingTheme>();

  addConfig(c: WhiteLabelConfig) { this.configs.set(c.configId, { ...c }); }
  getConfig(id: string) { const c = this.configs.get(id); return c ? { ...c } : undefined; }
  getConfigByTenant(tenantId: string) { return this.getAllConfigs().find(c => c.tenantId === tenantId); }
  getAllConfigs() { return Array.from(this.configs.values()).map(c => ({ ...c })); }

  addTheme(t: BrandingTheme) { this.themes.set(t.themeId, { ...t }); }
  getAllThemes() { return Array.from(this.themes.values()).map(t => ({ ...t })); }

  clear() { this.configs.clear(); this.themes.clear(); }

  toJSON() { return { configs: this.getAllConfigs(), themes: this.getAllThemes() }; }
  fromJSON(d: { configs?: WhiteLabelConfig[]; themes?: BrandingTheme[] }) {
    this.clear();
    (d.configs || []).forEach(c => this.addConfig(c));
    (d.themes || []).forEach(t => this.addTheme(t));
  }
  clone(): WhiteLabelSynchronizer { const c = new WhiteLabelSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
