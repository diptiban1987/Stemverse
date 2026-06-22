/**
 * Phase 39A — White Label Runtime Tests
 */
import { describe, it, expect } from 'vitest';
import {
  createWhiteLabelConfig, enableWhiteLabel, disableWhiteLabel,
  updateBranding, setCustomDomain, setCustomLogo, setCustomColors,
  setCustomEmail, setCustomCertificate,
  createBrandingTheme, getPresetThemes, applyTheme,
  WhiteLabelSynchronizer,
} from '../src/stage/white-label-runtime';

describe('Phase 39A: White Label Runtime', () => {
  it('creates configs for all scopes over 500 iterations', () => {
    const scopes = ['school', 'district', 'enterprise', 'competition', 'marketplace'] as const;
    for (let i = 0; i < 500; i++) {
      scopes.forEach(scope => {
        const cfg = createWhiteLabelConfig(`t${i}`, `Tenant ${i}`, scope);
        expect(cfg.scope).toBe(scope);
        expect(cfg.enabled).toBe(false);
        expect(cfg.primaryColor).toBe('#2563EB');
      });
    }
  });

  it('enable/disable/update branding over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let cfg = createWhiteLabelConfig('t1', 'Test', 'school');
      cfg = enableWhiteLabel(cfg);
      expect(cfg.enabled).toBe(true);
      cfg = disableWhiteLabel(cfg);
      expect(cfg.enabled).toBe(false);
      cfg = updateBranding(cfg, { footerText: 'My School' });
      expect(cfg.footerText).toBe('My School');
    }
  });

  it('custom domain/logo/colors/email/certificate over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let cfg = createWhiteLabelConfig('t1', 'Test', 'enterprise');
      cfg = setCustomDomain(cfg, 'learning.school.edu');
      expect(cfg.customDomain).toBe('learning.school.edu');
      cfg = setCustomLogo(cfg, '/logo.png');
      expect(cfg.logo).toBe('/logo.png');
      cfg = setCustomColors(cfg, '#FF0000', '#00FF00', '#0000FF');
      expect(cfg.primaryColor).toBe('#FF0000');
      cfg = setCustomEmail(cfg, 'admin@school.edu', '<h1>Welcome</h1>');
      expect(cfg.customEmailFrom).toBe('admin@school.edu');
      cfg = setCustomCertificate(cfg, '<cert>{{name}}</cert>');
      expect(cfg.customCertificateTemplate).toContain('{{name}}');
    }
  });

  it('preset themes', () => {
    const themes = getPresetThemes();
    expect(themes).toHaveLength(5);
    expect(themes.map(t => t.name)).toContain('Government');
    let cfg = createWhiteLabelConfig('t1', 'Test', 'school');
    cfg = applyTheme(cfg, themes[0]);
    expect(cfg.primaryColor).toBe(themes[0].primaryColor);
  });

  it('custom themes over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const theme = createBrandingTheme(`Theme ${i}`, '#111', '#222', '#333');
      expect(theme.preset).toBe(false);
    }
  });

  it('WhiteLabelSynchronizer lifecycle', () => {
    const sync = new WhiteLabelSynchronizer();
    for (let i = 0; i < 50; i++) {
      sync.addConfig(enableWhiteLabel(createWhiteLabelConfig(`t${i}`, `Tenant ${i}`, 'school')));
    }
    expect(sync.getAllConfigs()).toHaveLength(50);
    expect(sync.getConfigByTenant('t0')?.enabled).toBe(true);
    const clone = sync.clone();
    expect(clone.getAllConfigs()).toHaveLength(50);
    sync.clear();
    expect(sync.getAllConfigs()).toHaveLength(0);
  });
});
