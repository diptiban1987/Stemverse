/**
 * Phase 38B — Accessibility Runtime
 *
 * WCAG 2.2 AA, keyboard navigation, focus management,
 * screen reader, ARIA, contrast, motion reduction,
 * font scaling, high contrast, color blindness modes.
 */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ─── Types ───────────────────────────────────────────────────

export type WcagLevel = 'A' | 'AA' | 'AAA';
export type ColorBlindnessMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

export interface AccessibilityConfig {
  wcagLevel: WcagLevel;
  keyboardNavigation: boolean;
  screenReaderMode: boolean;
  highContrastMode: boolean;
  reducedMotion: boolean;
  fontScale: number;
  colorBlindnessMode: ColorBlindnessMode;
  focusIndicatorWidth: number;
  focusIndicatorColor: string;
  minimumTouchTarget: number;
}

export interface AriaAttributes {
  role: string;
  label: string;
  describedBy: string;
  live: 'off' | 'polite' | 'assertive';
  expanded: boolean | null;
  selected: boolean | null;
  disabled: boolean;
  hidden: boolean;
}

export interface ContrastResult {
  foreground: string;
  background: string;
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  passesAALarge: boolean;
}

export interface FocusTrap {
  trapId: string;
  firstElement: string;
  lastElement: string;
  active: boolean;
  returnFocus: string;
}

export interface KeyboardShortcut {
  shortcutId: string;
  key: string;
  modifiers: string[];
  action: string;
  description: string;
  category: string;
}

export interface AccessibilityAuditResult {
  totalElements: number;
  passedElements: number;
  failedElements: number;
  warnings: number;
  score: number;
  issues: AccessibilityIssue[];
}

export interface AccessibilityIssue {
  issueId: string;
  element: string;
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  wcagCriteria: string;
}

// ─── Config ──────────────────────────────────────────────────

export function createDefaultAccessibilityConfig(): AccessibilityConfig {
  return {
    wcagLevel: 'AA', keyboardNavigation: true, screenReaderMode: false,
    highContrastMode: false, reducedMotion: false, fontScale: 1.0,
    colorBlindnessMode: 'none', focusIndicatorWidth: 3,
    focusIndicatorColor: '#2563EB', minimumTouchTarget: 44,
  };
}

export function enableHighContrast(config: AccessibilityConfig): AccessibilityConfig {
  return { ...config, highContrastMode: true, focusIndicatorColor: '#FFFF00', focusIndicatorWidth: 4 };
}

export function enableReducedMotion(config: AccessibilityConfig): AccessibilityConfig {
  return { ...config, reducedMotion: true };
}

export function setFontScale(config: AccessibilityConfig, scale: number): AccessibilityConfig {
  return { ...config, fontScale: Math.max(0.5, Math.min(3.0, scale)) };
}

export function setColorBlindnessMode(config: AccessibilityConfig, mode: ColorBlindnessMode): AccessibilityConfig {
  return { ...config, colorBlindnessMode: mode };
}

export function enableScreenReader(config: AccessibilityConfig): AccessibilityConfig {
  return { ...config, screenReaderMode: true };
}

// ─── ARIA Helpers ────────────────────────────────────────────

export function createAriaAttributes(role: string, label: string, describedBy = ''): AriaAttributes {
  return { role, label, describedBy, live: 'off', expanded: null, selected: null, disabled: false, hidden: false };
}

export function createComponentAria(componentType: string, value: string): AriaAttributes {
  return createAriaAttributes('img', `${componentType}: ${value}`, `${componentType} electronic component with value ${value}`);
}

export function createWireAria(from: string, to: string, color: string): AriaAttributes {
  return createAriaAttributes('img', `Wire from ${from} to ${to}`, `${color} wire connecting ${from} to ${to}`);
}

export function createButtonAria(label: string, disabled = false): AriaAttributes {
  return { ...createAriaAttributes('button', label), disabled };
}

export function createLiveRegion(label: string, politeness: 'polite' | 'assertive' = 'polite'): AriaAttributes {
  return { ...createAriaAttributes('status', label), live: politeness };
}

// ─── Contrast Validation ─────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function calculateContrastRatio(fg: string, bg: string): number {
  const [r1, g1, b1] = hexToRgb(fg);
  const [r2, g2, b2] = hexToRgb(bg);
  const l1 = relativeLuminance(r1, g1, b1);
  const l2 = relativeLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function validateContrast(fg: string, bg: string): ContrastResult {
  const ratio = calculateContrastRatio(fg, bg);
  return { foreground: fg, background: bg, ratio, passesAA: ratio >= 4.5, passesAAA: ratio >= 7.0, passesAALarge: ratio >= 3.0 };
}

// ─── Focus Management ────────────────────────────────────────

export function createFocusTrap(firstElement: string, lastElement: string, returnFocus: string): FocusTrap {
  return { trapId: uid(), firstElement, lastElement, active: true, returnFocus };
}

export function releaseFocusTrap(trap: FocusTrap): FocusTrap {
  return { ...trap, active: false };
}

// ─── Keyboard Shortcuts ──────────────────────────────────────

export function createKeyboardShortcut(key: string, modifiers: string[], action: string, description: string, category = 'general'): KeyboardShortcut {
  return { shortcutId: uid(), key, modifiers, action, description, category };
}

export function getDefaultSimulatorShortcuts(): KeyboardShortcut[] {
  return [
    createKeyboardShortcut('z', ['ctrl'], 'undo', 'Undo last action', 'edit'),
    createKeyboardShortcut('y', ['ctrl'], 'redo', 'Redo last action', 'edit'),
    createKeyboardShortcut('s', ['ctrl'], 'save', 'Save project', 'file'),
    createKeyboardShortcut('Delete', [], 'delete', 'Delete selected', 'edit'),
    createKeyboardShortcut('Escape', [], 'deselect', 'Deselect all', 'selection'),
    createKeyboardShortcut('Tab', [], 'next_component', 'Focus next component', 'navigation'),
    createKeyboardShortcut('Tab', ['shift'], 'prev_component', 'Focus previous component', 'navigation'),
    createKeyboardShortcut('+', ['ctrl'], 'zoom_in', 'Zoom in', 'view'),
    createKeyboardShortcut('-', ['ctrl'], 'zoom_out', 'Zoom out', 'view'),
    createKeyboardShortcut('0', ['ctrl'], 'zoom_reset', 'Reset zoom', 'view'),
    createKeyboardShortcut('g', ['ctrl'], 'toggle_grid', 'Toggle grid', 'view'),
    createKeyboardShortcut('Space', [], 'run_simulation', 'Run/stop simulation', 'simulation'),
    createKeyboardShortcut('r', ['ctrl'], 'reset_simulation', 'Reset simulation', 'simulation'),
    createKeyboardShortcut('p', ['ctrl'], 'properties', 'Open properties panel', 'panels'),
    createKeyboardShortcut('c', ['ctrl'], 'copy', 'Copy selected', 'edit'),
    createKeyboardShortcut('v', ['ctrl'], 'paste', 'Paste', 'edit'),
  ];
}

// ─── Accessibility Audit ─────────────────────────────────────

export function createAccessibilityIssue(element: string, rule: string, severity: AccessibilityIssue['severity'], message: string, wcagCriteria: string): AccessibilityIssue {
  return { issueId: uid(), element, rule, severity, message, wcagCriteria };
}

export function runAccessibilityAudit(totalElements: number, issues: AccessibilityIssue[]): AccessibilityAuditResult {
  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const passed = totalElements - errors;
  return { totalElements, passedElements: passed, failedElements: errors, warnings, score: totalElements > 0 ? Math.round((passed / totalElements) * 100) : 0, issues };
}

// ─── Synchronizer ────────────────────────────────────────────

export class AccessibilitySynchronizer {
  private config: AccessibilityConfig = createDefaultAccessibilityConfig();
  private shortcuts: KeyboardShortcut[] = [];
  private traps = new Map<string, FocusTrap>();
  private auditResults: AccessibilityAuditResult[] = [];

  setConfig(c: AccessibilityConfig) { this.config = { ...c }; }
  getConfig() { return { ...this.config }; }

  setShortcuts(s: KeyboardShortcut[]) { this.shortcuts = s.map(x => ({ ...x })); }
  getShortcuts() { return this.shortcuts.map(s => ({ ...s })); }

  addTrap(t: FocusTrap) { this.traps.set(t.trapId, { ...t }); }
  getTrap(id: string) { const t = this.traps.get(id); return t ? { ...t } : undefined; }

  addAuditResult(r: AccessibilityAuditResult) { this.auditResults.push({ ...r }); }
  getAuditResults() { return this.auditResults.map(r => ({ ...r })); }

  clear() { this.config = createDefaultAccessibilityConfig(); this.shortcuts = []; this.traps.clear(); this.auditResults = []; }

  toJSON() { return { config: this.getConfig(), shortcuts: this.getShortcuts(), auditResults: this.getAuditResults() }; }
  fromJSON(d: { config?: AccessibilityConfig; shortcuts?: KeyboardShortcut[]; auditResults?: AccessibilityAuditResult[] }) {
    this.clear();
    if (d.config) this.setConfig(d.config);
    if (d.shortcuts) this.setShortcuts(d.shortcuts);
    (d.auditResults || []).forEach(r => this.addAuditResult(r));
  }
  clone(): AccessibilitySynchronizer { const c = new AccessibilitySynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
